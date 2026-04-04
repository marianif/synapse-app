Pod::Spec.new do |s|
  s.name           = 'WidgetBridge'
  s.version        = '1.0.0'
  s.summary        = 'Bridge between React Native and iOS WidgetKit'
  s.description    = 'Writes entry data to App Group UserDefaults and reloads WidgetKit timelines'
  s.license        = 'MIT'
  s.homepage       = 'https://github.com/placeholder'
  s.author         = 'Synapse'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { :path => '.' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = 'src/**/*.{h,m,swift}'
  s.frameworks = 'WidgetKit'
end
