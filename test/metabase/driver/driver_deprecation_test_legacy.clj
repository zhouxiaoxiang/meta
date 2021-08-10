(ns metabase.driver.driver-deprecation-test-legacy
  "Dummy driver for driver deprecation testing (legacy driver)"
  (:require [metabase.driver :as driver]
            metabase.driver.sql))

(comment metabase.driver.sql/keep-me)

(driver/register! :driver-deprecation-test-legacy, :parent :sql)
