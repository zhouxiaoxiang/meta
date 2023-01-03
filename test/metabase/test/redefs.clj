(ns metabase.test.redefs
  "Redefinitions of vars from 3rd-party namespaces to make sure they do extra stuff we want (like initialize things if
  needed when running)."
  (:require
   [metabase.test-runner.parallel :as test-runner.parallel]
   [methodical.core :as methodical]
   [toucan2.tools.with-temp :as t2.with-temp]))

(methodical/defmethod t2.with-temp/do-with-temp* :before :default
  "Initialize application DB if needed. Make sure method impls in [[metabase.test.util]] are loaded."
  [_model _explicit-attributes f]
  ((requiring-resolve 'metabase.test.initialize/initialize-if-needed!) :db)
  ;; so with-temp-defaults are loaded
  (require 'metabase.test.util)
  ;; TODO -- there's not really a reason that we can't use with-temp in parallel tests -- it depends on the test -- so
  ;; once we're a little more comfortable with the current parallel stuff we should remove this restriction.
  (test-runner.parallel/assert-test-is-not-parallel "with-temp")
  ;; ok, now return `f` so it gets threaded to the next method.
  f)

;;; wrap `with-redefs-fn` (used by `with-redefs`) so it calls `assert-test-is-not-parallel`

(defonce orig-with-redefs-fn with-redefs-fn)

(defn new-with-redefs-fn [& args]
  (test-runner.parallel/assert-test-is-not-parallel "with-redefs")
  (apply orig-with-redefs-fn args))

(alter-var-root #'with-redefs-fn (constantly new-with-redefs-fn))
