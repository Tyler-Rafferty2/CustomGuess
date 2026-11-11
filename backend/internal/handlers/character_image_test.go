package handlers

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"
)

func multipartRequest(t *testing.T, fill func(w *multipart.Writer)) *http.Request {
	t.Helper()
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	fill(w)
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodPost, "/", &buf)
	req.Header.Set("Content-Type", w.FormDataContentType())
	return req
}

func TestRequireCharacterImage_File(t *testing.T) {
	req := multipartRequest(t, func(w *multipart.Writer) {
		fw, err := w.CreateFormFile("characters[0][image]", "a.png")
		if err != nil {
			t.Fatal(err)
		}
		fw.Write([]byte("png-bytes"))
	})
	f, h, err := requireCharacterImage(req, "characters[0][image]")
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	defer f.Close()
	if h.Filename != "a.png" {
		t.Fatalf("filename = %q", h.Filename)
	}
}

func TestRequireCharacterImage_TextValueRejected(t *testing.T) {
	req := multipartRequest(t, func(w *multipart.Writer) {
		w.WriteField("characters[0][image]", "https://pub-19a8df9d958c4ee79bbeed604cf74512.r2.dev/x.png")
	})
	if _, _, err := requireCharacterImage(req, "characters[0][image]"); err != errMissingImage {
		t.Fatalf("expected errMissingImage, got %v", err)
	}
}

func TestRequireCharacterImage_Missing(t *testing.T) {
	req := multipartRequest(t, func(w *multipart.Writer) {
		w.WriteField("characters[0][name]", "Bob")
	})
	if _, _, err := requireCharacterImage(req, "characters[0][image]"); err != errMissingImage {
		t.Fatalf("expected errMissingImage, got %v", err)
	}
}
