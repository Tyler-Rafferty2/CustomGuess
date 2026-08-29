package handlers

import (
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
)

// NewAnalyticsProxyHandler builds a reverse proxy to the given Umami base
// URL (e.g. "http://127.0.0.1:3300"), stripping stripPrefix so Umami sees
// its own expected root-relative paths. Auth (or lack of it) is applied by
// the caller via middleware on the route this is mounted at — this handler
// has no opinion on who's allowed to call it.
func NewAnalyticsProxyHandler(targetURL, stripPrefix string) http.Handler {
	target, err := url.Parse(targetURL)
	if err != nil {
		panic("invalid analytics proxy target URL: " + err.Error())
	}

	proxy := httputil.NewSingleHostReverseProxy(target)
	// Umami sets its own permissive CORS headers on responses. This app's
	// CORS middleware already sets the correct ones for our origin list;
	// without stripping Umami's, the client sees two values for the same
	// header (e.g. two Access-Control-Allow-Origin), which browsers treat
	// as an invalid CORS response and block outright.
	proxy.ModifyResponse = func(resp *http.Response) error {
		for header := range resp.Header {
			if strings.HasPrefix(strings.ToLower(header), "access-control-") {
				resp.Header.Del(header)
			}
		}
		return nil
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.URL.Path = strings.TrimPrefix(r.URL.Path, stripPrefix)
		if r.URL.Path == "" {
			r.URL.Path = "/"
		}
		proxy.ServeHTTP(w, r)
	})
}
