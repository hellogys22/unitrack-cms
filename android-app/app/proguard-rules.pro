# UniTrack CMS Android WebView ProGuard / R8 Rules
-keepattributes *Annotation*
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
