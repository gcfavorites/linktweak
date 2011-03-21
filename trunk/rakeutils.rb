require 'erb'

module RakeUtils

  def self.replace_path(new_path, targets, suffix=nil)
    if String === targets
      fname = File.join(new_path, File.basename(targets))
      if suffix
        fname = fname.gsub(/\.[^\.\/]+\z/u, '') + '.' + suffix
      end
      fname
    else
      targets.map{|n| replace_path(new_path, n, suffix) }
    end
  end

  class JavaScriptOptimizer
    def initialize(config = {})
      @java            = config[:java]            || 'java'
      @python          = config[:python]          || 'python'
      @yuicompressor   = config[:yuicompressor]
      @closurecompiler = config[:closurecompiler]
      @closurelibrary  = config[:closurelibrary]  || 'closure-library'
      @closurebuilder  = (config[:closurebuilder] ||
                          File.join(@closurelibrary, 'closure/bin/build/closurebuilder.py'))
      @closureopts     = config[:closureopts]     || ''
      @optimize        = config[:optimize]
    end

    def optimize_str(code)
      if @optimize && @yuicompressor
        code = exec([@java, '-jar', @yuicompressor, '--type', 'js'], code)
      end
      code
    end

    def optimize(*paths)
      optimize_str(paths.map{|path| IO.read(path) }.join("\n"))
    end

    def compile_str(compiler_opts, code)
      if @closurecompiler && @optimize
        opts = build_closure_opts(@closureopts.merge(compiler_opts))
        code = exec([@java, '-jar', @closurecompiler, opts], code)
      end
      code
    end

    def compile(compiler_opts, *paths)
      if @closurecompiler && @optimize
        opts = build_closure_opts(@closureopts.merge(compiler_opts))
        code = exec([@java, '-jar', @closurecompiler, opts,
                     paths.map{|path| ['--js', path] }])
      else
        code = paths.map{|path| IO.read(path) }.join("\n")
      end
      code
    end

    def compile_closure_app(namespace, compiler_opts=nil, *paths)
      cmd  = [@python, @closurebuilder, '-n', namespace, "--root=#{@closurelibrary}",
              paths.map{|path| "--root=#{path}" }]
      code = ''
      if @closurecompiler && @optimize
        opts = build_closure_opts(@closureopts.merge(compiler_opts || {}))
        code = exec([cmd, '-o', 'compiled', '-c', @closurecompiler,
                     opts.map{|s| ['-f', s] }])
      else
        opts = build_closure_opts(@closureopts.merge(compiler_opts || {}))
        code = exec([cmd, '-o', 'script'])
      end
      code
    end

    private

    def build_closure_opts(opts)
      opts.map do |key, values|
        [*values].map{|v| "#{key}=#{v}" }
      end.flatten
    end

    def exec(cmd, stdin = '')
      stdout = ''
      IO.popen([*cmd].flatten.map{|s| '"'+s+'"'}.join(' '), 'r+') do |pipe|
        pipe.write(stdin)
        pipe.close_write
        stdout = pipe.read
      end
      stdout
    end
  end

  class CssOptimizer
    def initialize(config = {})
      @java          = config[:java]            || 'java'
      @yuicompressor = config[:yuicompressor]
      @css_url_map   = config[:css_url_map]     || []
      @optimize      = config[:optimize]
    end

    def optimize(*paths)
      css = paths.map{|path| IO.read(path) }.join("\n")
      css = map_url(css)       unless @css_url_map.empty?
      css = yuicompressor(css) if @optimize
      css
    end

    def expand(*paths)
      css = paths.map{|path| expand_import(path) }.join("\n")
      css = map_url(css)       unless @css_url_map.empty?
      css = yuicompressor(css) if @optimize
      css
    end

    private

    def remove_comments(css)
      css.gsub(/\/\*.*?\*\//mu, '')
    end

    def expand_import(path)
      dir = File.expand_path(File.dirname(path))
      css = IO.read(path)
      css = remove_comments(css)
      css = css.gsub(/^@import(?:\s+url\()?\s*[\"\']?([^\"\'\)]+)[\"\']?\s*\)?([^;]*);/u) do
        text, url, media = $0, $1.strip, $2.strip
        if /^(?:https?:\/)\//u === url
          text
        else
          sub_css = expand_import(File.join(dir, url))
          unless media.empty?
            sub_css = "@media #{media} {\n#{sub_css}\n}\n"
          end
          sub_css
        end
      end
    end

    def map_url(css)
      css.gsub(/(\W)url\(\s*[\"\']?([^\"\'\)]+)[\"\']?\s*\)/u) do
        space, url = $1, $2.strip
        @css_url_map.each do |pattern, replace|
          if pattern === url
            url.gsub!(pattern, replace)
            break
          end
        end
        "#{space}url(\"#{url}\")"
      end
    end

    def yuicompressor(css)
      if @yuicompressor
        css = exec([@java, '-jar', @yuicompressor, '--type', 'css'], css)
      end
      css
    end

    def exec(cmd, stdin = '')
      stdout = ''
      IO.popen([*cmd].flatten.map{|s| '"'+s+'"'}.join(' '), 'r+') do |pipe|
        pipe.write(stdin)
        pipe.close_write
        stdout = pipe.read
      end
      stdout
    end
  end

  class HtmlOptimizer

    def initialize(config = {})
      @optimize      = config[:optimize]
      @pre_tag_regex = nil

      pre_tag = config[:pre_tag] ? [*config[:pre_tag]] : ['pre', 'script', 'title']
      unless pre_tag.empty?
        pre_tag = pre_tag.map{|s| Regexp.quote(s) }.join('|')
        @pre_tag_regex = /<(#{pre_tag})[\s>].*?<\/\1\s*>/mui
      end

      @jsoptimizer  = JavaScriptOptimizer.new(config)
      @cssoptimizer = CssOptimizer.new(config)
    end

    def render_str(str)
      str = str.gsub(/<!--\[del\].*?\[\/del\]-->/mu, '')
      str = str.gsub(/<!--\[uncomment\](.*?)-->/mu){ $1 }
      erb = ERB.new(str)
      optimize_html(erb.result(get_binding()))
    end

    def render_file(path)
      str = IO.read(path)
      Dir.chdir(File.dirname(path)) do
        render_str(str)
      end
    end

    def include_file(path)
      IO.read(path)
    end

    def expand_css(*paths)
      @cssoptimizer.expand(*paths)
    end

    def compress_css(*paths)
      @cssoptimizer.optimize(*paths)
    end

    def escape_js(str)
      str.gsub(/<\/(script)/ui, '<\\/\1')
    end

    def include_js(path)
      escape_js(IO.read(path))
    end

    def compress_js(*paths)
      escape_js(@jsoptimizer.optimize(*paths))
    end

    def compile_js(compiler_opts={}, *paths)
      escape_js(@jsoptimizer.compile(compiler_opts, *paths))
    end

    def compile_closure_app(namespace, compiler_opts=nil, *paths)
      escape_js(@jsoptimizer.compile_closure_app(namespace, compiler_opts, *paths))
    end

    def optimize_html(html)
      html = html.dup
      if @optimize
        html.gsub!(/<\!--(.*?)-->/mu) do |text|
          /\A\[if\s.*<\!\[endif\]\z/mu === $1 ? text : ''
        end
        html.gsub!(/[~^]/u) {|c| c == '~' ? '^T~' : '^E~' }
        preserved = []
        if @pre_tag_regex
          html.gsub!(@pre_tag_regex) do |pre|
            preserved << pre
            "^#{preserved.size-1}~"
          end
        end
        html.gsub!(/<[A-Za-z](?:[^>]*)>/u) do |tag|
          tag.gsub(/([\"\']).+?\1/mui) do |attr|
            preserved << attr
            "^#{preserved.size-1}~"
          end
        end
        html.gsub!(/\s+/u, ' ')
        html.gsub!(/\^(\d+)~/u) { preserved[$1.to_i] }
        html.gsub!(/\^([TE])~/u) { $1 == 'T' ? '~' : '^' }
      end
      html
    end

    def get_binding()
      binding
    end

    def exec(cmd, stdin = '')
      stdout = ''
      IO.popen([*cmd].flatten.map{|s| '"'+s+'"'}.join(' '), 'r+') do |pipe|
        pipe.write(stdin)
        pipe.close_write
        stdout = pipe.read
      end
      stdout
    end

  end

end
