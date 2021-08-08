(ns metabase.bootstrap-bootstrap)

;; time clojure -A:user:dev -e "((requiring-resolve 'metabase.bootstrap-bootstrap/profile-async) 32)"
;;
;; LOAD BOOTSTRAP NAMESPACE
;; "Elapsed time: 3778.89799 msecs"

;; real    0m4.730s
;; user    0m22.419s
;; sys     0m1.245s
(defn profile-async [n]
  (println "LOAD BOOTSTRAP NAMESPACE")
  (time (require 'metabase.bootstrap-core-async)))

;; time clojure -A:user:dev -e "((requiring-resolve 'metabase.bootstrap-bootstrap/profile) 32)"
;;
;; LOAD BOOTSTRAP NAMESPACE
;; "Elapsed time: 322.913402 msecs"

;; real    0m1.341s
;; user    0m4.648s
;; sys     0m0.593s
(defn profile [n]
  (println "LOAD BOOTSTRAP NAMESPACE")
  (time (require 'metabase.bootstrap)))
