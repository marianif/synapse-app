Pod::Spec.new do |s|
  s.name           = 'SynapseWatchConnectivity'
  s.version        = '1.0.0'
  s.summary        = 'WCSession native module for Synapse'
  s.description    = 'Apple Watch connectivity bridge'
  s.license        = 'MIT'
  s.homepage       = 'https://github.com/placeholder'
  s.author         = 'Synapse'
  s.platforms      = { :ios => '15.1', :watchos => '10.0' }
  s.swift_version  = '5.9'
  s.source         = { :path => '.' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = 'src/**/*.{h,m,swift}'
  s.frameworks = 'WatchConnectivity'
end
