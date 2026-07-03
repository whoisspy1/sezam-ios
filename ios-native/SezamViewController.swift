import UIKit
import Capacitor
import WebKit

// Custom Capacitor bridge view controller for SEZAM Smart Home.
//
// The web layer (www/) is a native-feeling chooser screen served from
// capacitor://localhost. When the user picks Online/Local it calls
//   window.webkit.messageHandlers.sezam.postMessage({action, url, globals})
// and this controller:
//   1. registers `globals` (brand strings + logo data-URIs for the chosen
//      language) as a documentStart user script, and
//   2. loads the remote Home Assistant URL into the SAME WKWebView, where the
//      bundled inject.js (added once, documentEnd) rebrands it to SEZAM.
//
// inject.js is self-observing (MutationObserver + interval), so a single
// documentEnd injection survives Home Assistant's in-app SPA navigation.
class SezamViewController: CAPBridgeViewController, WKScriptMessageHandler {

    override func capacitorDidLoad() {
        super.capacitorDidLoad()

        // Dark background everywhere so overscroll / safe-area areas never flash
        // white behind the Home Assistant page.
        let dark = UIColor(red: 0.106, green: 0.106, blue: 0.106, alpha: 1.0) // #1B1B1B
        self.view.backgroundColor = dark
        if let wv = bridge?.webView {
            wv.isOpaque = true
            wv.backgroundColor = dark
            wv.scrollView.backgroundColor = dark
            // Let the Home Assistant page handle safe areas itself (it uses
            // viewport-fit=cover + env(safe-area-inset-*)). Prevents the double
            // top gap and keeps taps aligned with what's drawn.
            if #available(iOS 11.0, *) {
                wv.scrollView.contentInsetAdjustmentBehavior = .never
            }
        }

        guard let ucc = bridge?.webView?.configuration.userContentController else { return }

        // Bridge from the chooser page.
        ucc.add(self, name: "sezam")

        // The rebranding script — applied at documentEnd of every real load.
        if let path = Bundle.main.path(forResource: "inject", ofType: "js", inDirectory: "public"),
           let js = try? String(contentsOfFile: path, encoding: .utf8) {
            ucc.addUserScript(WKUserScript(source: js,
                                           injectionTime: .atDocumentEnd,
                                           forMainFrameOnly: false))
        }
    }

    func userContentController(_ ucc: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        guard message.name == "sezam",
              let body = message.body as? [String: Any],
              (body["action"] as? String) == "open",
              let urlStr = body["url"] as? String,
              let url = URL(string: urlStr) else { return }

        // Fresh brand/logo globals for the language picked on the chooser.
        // Re-adding on each open is fine: the last documentStart script wins,
        // and inject.js reads these globals at documentEnd.
        if let globals = body["globals"] as? String, !globals.isEmpty {
            ucc.addUserScript(WKUserScript(source: globals,
                                           injectionTime: .atDocumentStart,
                                           forMainFrameOnly: false))
        }

        DispatchQueue.main.async { [weak self] in
            self?.bridge?.webView?.load(URLRequest(url: url))
        }
    }
}
