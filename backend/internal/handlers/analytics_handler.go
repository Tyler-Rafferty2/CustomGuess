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

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.URL.Path = strings.TrimPrefix(r.URL.Path, stripPrefix)
		if r.URL.Path == "" {
			r.URL.Path = "/"
		}
		proxy.ServeHTTP(w, r)
	})
}
