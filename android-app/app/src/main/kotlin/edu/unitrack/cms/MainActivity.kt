package edu.unitrack.cms

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView

private const val APP_URL = "https://unitrack-cms.vercel.app"
private const val APP_HOST = "unitrack-cms.vercel.app"

class MainActivity : ComponentActivity() {
  private var webViewRef: WebView? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    enableEdgeToEdge(
      statusBarStyle = SystemBarStyle.dark(0xFF003366.toInt()),
      navigationBarStyle = SystemBarStyle.light(0xFFFFFFFF.toInt(), 0xFF003366.toInt())
    )

    setContent {
      MaterialTheme {
        Surface(
          modifier = Modifier.fillMaxSize(),
          color = Color(0xFF003366)
        ) {
          UniTrackWebApp(
            onAttachWebView = { webViewRef = it }
          )
        }
      }
    }
  }

  override fun onPause() {
    super.onPause()
    CookieManager.getInstance().flush()
  }

  override fun onDestroy() {
    webViewRef?.destroy()
    webViewRef = null
    super.onDestroy()
  }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun UniTrackWebApp(
  onAttachWebView: (WebView) -> Unit
) {
  var progress by remember { mutableIntStateOf(0) }
  var isLoading by remember { mutableStateOf(true) }
  var hasError by remember { mutableStateOf(false) }
  var canGoBack by remember { mutableStateOf(false) }
  var webView by remember { mutableStateOf<WebView?>(null) }

  BackHandler(enabled = canGoBack) {
    webView?.goBack()
  }

  Box(
    modifier = Modifier
      .fillMaxSize()
      .background(Color(0xFF003366))
      .statusBarsPadding()
      .navigationBarsPadding()
      .background(Color(0xFFF4F7FB))
  ) {
    AndroidView(
      modifier = Modifier.fillMaxSize(),
      factory = { context ->
        WebView(context).apply {
          val cookieManager = CookieManager.getInstance()
          cookieManager.setAcceptCookie(true)
          cookieManager.setAcceptThirdPartyCookies(this, true)

          settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            useWideViewPort = true
            loadWithOverviewMode = true
            javaScriptCanOpenWindowsAutomatically = true
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            cacheMode = WebSettings.LOAD_DEFAULT
          }

          webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
              progress = newProgress
              isLoading = newProgress < 100
            }
          }

          webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
              hasError = false
              isLoading = true
              canGoBack = view?.canGoBack() ?: false
            }

            override fun onPageFinished(view: WebView?, url: String?) {
              isLoading = false
              canGoBack = view?.canGoBack() ?: false
              CookieManager.getInstance().flush()
            }

            override fun onReceivedError(
              view: WebView?,
              request: WebResourceRequest?,
              error: WebResourceError?
            ) {
              if (request?.isForMainFrame == true) {
                hasError = true
                isLoading = false
              }
            }

            override fun shouldOverrideUrlLoading(
              view: WebView?,
              request: WebResourceRequest?
            ): Boolean {
              val uri = request?.url ?: return false
              val host = uri.host ?: return false
              val path = uri.path ?: ""

              // Open APK download link or external domains in system browser
              if (host != APP_HOST || path.endsWith(".apk")) {
                context.startActivity(Intent(Intent.ACTION_VIEW, uri))
                return true
              }
              return false
            }
          }

          loadUrl(APP_URL)
          webView = this
          onAttachWebView(this)
        }
      }
    )

    if (isLoading && !hasError) {
      LinearProgressIndicator(
        progress = { (progress.coerceIn(5, 100)) / 100f },
        modifier = Modifier
          .fillMaxWidth()
          .height(3.dp)
          .align(Alignment.TopCenter),
        color = Color(0xFF0055CC),
        trackColor = Color(0xFFE5E9F0)
      )
    }

    if (hasError) {
      Column(
        modifier = Modifier
          .fillMaxSize()
          .background(Color(0xFFF4F7FB))
          .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
      ) {
        Text(
          text = "UniTrack CMS",
          fontSize = 22.sp,
          fontWeight = FontWeight.Bold,
          color = Color(0xFF003366)
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
          text = "Unable to connect to the UniTrack server. Check your internet connection and try again.",
          fontSize = 14.sp,
          color = Color(0xFF333333),
          textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(20.dp))
        Button(
          onClick = {
            hasError = false
            isLoading = true
            webView?.loadUrl(APP_URL)
          },
          colors = ButtonDefaults.buttonColors(
            containerColor = Color(0xFF0055CC),
            contentColor = Color.White
          )
        ) {
          Text("Retry Connection")
        }
      }
    }
  }
}
