# Org-unit data scoping for this column. The background and current status are kept in the team's
# private security findings log.
@sec @SEC-10 @CLE @SUP @RM @readonly-internal @orgunit
Feature: Read-only internal column — org-unit scoping (currently inert)

  # Two assertions, because either alone can pass for the wrong reason. "More than one district" would
  # hold even against a narrowed-but-plural slice; "matches an administrator" would hold if BOTH were
  # narrowed to nothing. Together they pin "no narrowing is happening at all".
  @p1
  Scenario: An internal reader sees every district's rows, exactly as an administrator does
    When I search designations across every district as an internal reader
    Then the designation results should span more than one district
    When an administrator runs the same designation search
    Then the designation results should match an administrator exactly

  # The Work Bench is where the `(ltd)` qualifier actually appears for this column (§A), so it is the
  # screen that narrows FIRST when the seam is wired. Pinned unscoped now so that change is visible.
  @p1
  Scenario Outline: The <queue> Work Bench queue is reachable and unnarrowed for <role>
    When I call "GET" "<endpoint>" as the "<role>" role
    Then the API should allow it

    Examples: SCS_CLERICAL — `R (ltd)`, so this is the column the qualifier applies to
      | role         | queue       | endpoint                                 |
      | SCS_CLERICAL | scaler auth | /api/scaler-authorizations/workbench     |
      | SCS_CLERICAL | site auth   | /api/scale-site-authorizations/workbench |
      | SCS_CLERICAL | designation | /api/mark-site-designations/workbench    |

    Examples: SCS_REGIONAL_MANAGER — `R (ltd)` too, but a REGION rather than a district
      | role                 | queue       | endpoint                             |
      | SCS_REGIONAL_MANAGER | scaler auth | /api/scaler-authorizations/workbench |

    Examples: SCS_BRANCH_SYS_SUPPORT — plain `R`, so province-wide is correct for it even later
      | role                   | queue       | endpoint                             |
      | SCS_BRANCH_SYS_SUPPORT | scaler auth | /api/scaler-authorizations/workbench |

  # THE PREMISE OF THIS SUITE, asserted so it cannot rot silently.
  #
  # `R (ltd)` (CLE, RM) and plain `R` (SUP) must produce the same queue today, because the difference is
  # breadth rather than a permission letter. If this scenario fails, re-derive the suite per role.
  @p0
  Scenario: The `(ltd)` qualifier makes no difference yet, which is what licenses one suite for three roles
    Then all three roles should read the same Work Bench queue
