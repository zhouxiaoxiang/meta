(ns metabase.lib.native-test
  (:require
   [clojure.test :refer [are deftest is testing]]
   [metabase.lib.native :as lib.native]))

(deftest variable-tag-test
  (are [exp input] (= exp (lib.native/recognize-template-tags input))
    #{"foo"} "SELECT * FROM table WHERE {{foo}} AND some_field IS NOT NULL"
    #{"foo" "bar"} "SELECT * FROM table WHERE {{foo}} AND some_field = {{bar}}"
    ;; Duplicates are flattened.
    #{"foo" "bar"} "SELECT * FROM table WHERE {{foo}} AND some_field = {{bar  }} OR {{  foo}}"
    ;; Ignoring non-alphanumeric vars
    #{} "SELECT * FROM table WHERE {{&foo}}"))

(deftest snippet-tag-test
  (are [exp input] (= exp (lib.native/recognize-template-tags input))
    #{"snippet:   foo  "} "SELECT * FROM table WHERE {{snippet:   foo  }} AND some_field IS NOT NULL"
    #{"snippet:   foo  *#&@"} "SELECT * FROM table WHERE {{snippet:   foo  *#&@}}"
    ;; TODO: This logic should trim the whitespace and unify these two snippet names.
    ;; I think this is a bug in the original code but am aiming to reproduce it exactly for now.
    #{"snippet: foo" "snippet:foo"} "SELECT * FROM table WHERE {{snippet: foo}} AND {{snippet:foo}}"))

(deftest card-tag-test
  (are [exp input] (= exp (lib.native/recognize-template-tags input))
    #{"#123"} "SELECT * FROM table WHERE {{ #123 }} AND some_field IS NOT NULL"
    ;; TODO: This logic should trim the whitespace and unify these two card tags.
    ;; I think this is a bug in the original code but am aiming to reproduce it exactly for now.
    #{"#123" "#123-with-slug"} "SELECT * FROM table WHERE {{ #123 }} AND {{  #123-with-slug  }}"
    #{"#123"} "SELECT * FROM table WHERE {{ #not-this }} AND {{#123}}"))
