package handlers

import (
    "fmt"
    "net/http"

    "github.com/go-chi/chi/v5"
)

func GetUser(w http.ResponseWriter, r *http.Request) {
    id := chi.URLParam(r, "id")
    fmt.Fprintf(w, "User ID: %s", id)
}

func CreateUser(w http.ResponseWriter, r *http.Request) {
    w.Write([]byte("Create user endpoint"))
}
