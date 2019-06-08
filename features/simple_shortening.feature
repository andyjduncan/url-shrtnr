Feature: Simple URL shortening
  In order to use fewer bytes
  As a URL linker
  I want my URLs to be as short as possible

  Scenario:
    Given a long URL
    When I shorten it
    Then I should be given a shorter URL to the original URL