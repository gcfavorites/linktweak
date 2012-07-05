# -*- coding: utf-8; mode: ruby -*-

require 'rake/clean'
require File.join(File.dirname(__FILE__), 'rakeutils.rb')

CLOSURE_LIB_DIR = File.expand_path('closure-library')
LIB_DIRS        = ['scripts']
ALL_SCRIPTS     = LIB_DIRS.map{|d| FileList[File.join(d, '*.js')] }.flatten
EXTERNS         = FileList['externs/*.js']
OPERA_TARGETS   = ['opera/Background.js', 'opera/includes/Content.js', 'opera/Options.js',
                   'opera/index.html', 'opera/options.html', 'opera/icon-64.png']
CHROME_TARGETS  = ['chrome/Background.js', 'chrome/Content.js', 'chrome/Options.js',
                   'chrome/index.html', 'chrome/options.html',
                   'chrome/icon-128.png', 'chrome/icon-48.png', 'chrome/icon-64.png']
PACKAGES        = ['packages/linktweak.oex', 'packages/linktweak.zip']

CLOBBER.include(OPERA_TARGETS, CHROME_TARGETS, PACKAGES)

OPTIMIZE_OPTIONS = {
  :optimize        => false,
  :python          => 'python',
  :java            => 'java',
  :closurecompiler => File.expand_path('bin/compiler.jar'),
  :closurelibrary  => CLOSURE_LIB_DIR,
  :closureopts     => {
    '--define'            => 'goog.DEBUG=false',
    '--output_wrapper'    => '(function(){%output%})();',
    '--externs'           => EXTERNS,
    '--compilation_level' => 'ADVANCED_OPTIMIZATIONS'
  }
}

task :default, 'optimize'
task :default  => [:opera, :chrome]

task :opera, 'optimize'
task :opera    => OPERA_TARGETS

task :chrome, 'optimize'
task :chrome   => CHROME_TARGETS

task :packages => PACKAGES

rule(/^(?:opera|chrome)\/.+\.js$/u => ALL_SCRIPTS) do |t, args|
  mkdir_p(File.dirname(t.name), :verbose => false)
  opts = OPTIMIZE_OPTIONS.merge(:optimize => args['optimize'] != 'no')
  if /^(opera|chrome)/u === t.name
    opts[:optimize] = false if $1 == 'opera'
    opts[:closureopts]['--define'] =
      [*opts[:closureopts]['--define']] + ["linktweak.globals.PLATFORM=\\\"#{$1}\\\""]
  end
  optimizer = RakeUtils::JavaScriptOptimizer.new(opts)
  namespace = "linktweak.#{File.basename(t.name, '.js')}"
  jscode    = optimizer.compile_closure_app(namespace, nil, *LIB_DIRS)
  unless opts[:optimize]
    jscode = "var CLOSURE_NO_DEPS = true;\n" + jscode;
  end
  File.open(t.name, 'w'){|file| file << jscode }
end

rule(/^(?:opera|chrome)\/.+\.(?:png|html)$/u =>
     [proc {|n| File.join('assets', File.basename(n)) }]) do |t, args|
  cp(t.prerequisites[0], t.name, :verbose => false)
end

file 'packages/linktweak.oex' => FileList['opera/**/*'] do |t|
  mkdir_p(File.dirname(t.name), :verbose => false)
  rm_f(t.name)
  files = t.prerequisites.map{|fname| fname.sub(/^opera\//, '') }
  Dir.chdir('opera') do
    sh("zip ../#{t.name} " + files.join(' '))
  end
end

file 'packages/linktweak.zip' => FileList['chrome/**/*'] do |t|
  mkdir_p(File.dirname(t.name), :verbose => false)
  rm_f(t.name)
  files = t.prerequisites.map{|fname| fname.sub(/^chrome\//, '') }
  Dir.chdir('chrome') do
    sh("zip ../#{t.name} " + files.join(' '))
  end
end
