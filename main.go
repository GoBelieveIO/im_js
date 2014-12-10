package main

import (
	"encoding/hex"
	"io/ioutil"
	"log"
	"net/http"
	"time"
	"path"
	"strings"
	"github.com/googollee/go-engine.io"
)

func ServeFile(w http.ResponseWriter, r *http.Request) {
	upath := r.URL.Path
	if !strings.HasPrefix(upath, "/") {
		upath = "/" + upath
		r.URL.Path = upath
	}
	filepath := "./" + path.Clean(upath)
	w.Header().Set("Access-Control-Allow-Origin", "*")
	http.ServeFile(w, r, filepath)
}

func main() {
	server, err := engineio.NewServer(nil)
	if err != nil {
		log.Fatal(err)
	}
	server.SetPingInterval(time.Second * 2)
	server.SetPingTimeout(time.Second * 5)

	go func() {
		for {
			conn, _ := server.Accept()
			go func() {
				log.Println("connected:", conn.Id())
				defer func() {
					conn.Close()
					log.Println("disconnected:", conn.Id())
				}()
				for {
					t, r, err := conn.NextReader()
					if err != nil {
						return
					}
					b, err := ioutil.ReadAll(r)
					if err != nil {
						return
					}
					r.Close()
					if t == engineio.MessageText {
						log.Println(t, string(b))
					} else {
						log.Println(t, hex.EncodeToString(b))
					}
					w, err := conn.NextWriter(t)
					if err != nil {
						return
					}
					log.Println("pong.......")
					w.Write([]byte("pong"))
					w.Close()
				}
			}()
		}
	}()

	http.Handle("/engine.io/", server)
	//http.Handle("/", http.FileServer(http.Dir("./asset")))
	http.HandleFunc("/", ServeFile)
	log.Println("Serving at localhost:4000...")
	log.Fatal(http.ListenAndServe(":4000", nil))
}
