# Org-unit data scoping for this column. The background and current status are kept in the team's
# private security findings log.
@sec @SEC-10 @CHK @orgunit
Feature: Check Scaler — org-unit scoping (currently inert)

  Background:
    Given I am signed in as a check scaler

  # Two assertions, because either alone can pass for the wrong reason. "More than one district" alone
  # would hold even if the role saw a narrowed-but-plural slice; "matches an administrator" alone would
  # hold if BOTH were narrowed to nothing. Together they pin "no narrowing is happening at all".
  @p1
  Scenario: An internal role sees every district's rows, exactly as an administrator does
    When I search designations across every district as a check scaler
    Then the results should span more than one district
    When an administrator runs the same search
    Then the results should match an administrator exactly

  # The Work Bench is where the `(ltd)` qualifier actually appears in the matrix (§3.A), so it is the
  # screen that will narrow FIRST when the seam is wired. Pinned unscoped now so that change is visible.
  @p1
  Scenario Outline: The <queue> Work Bench queue is reachable and unnarrowed
    When I call "GET" "<endpoint>" as a check scaler
    Then the API should allow it

    Examples:
      | queue         | endpoint                                 |
      | scaler auth   | /api/scaler-authorizations/workbench     |
      | site auth     | /api/scale-site-authorizations/workbench |
      | designation   | /api/mark-site-designations/workbench    |
