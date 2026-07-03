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
