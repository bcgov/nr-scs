# Re-grounded from UC-CHK-001 S02 (DDN/DDV validation), S03 (uniqueness), S04 (max checks),
# S05 (step-2 business fields). Source: UC-CHK-001-slices.md / -technical.md (ERR-001..011).
#
# Two negative directions, both PROVEN not inferred:
#  - Step-1 client block (blank DDN): the write never leaves the browser -> assert ZERO validate POSTs.
#  - Step-1 server rejection (HBS existence / uniqueness / max): validate is called and returns a
#    field error; the page stays on step 1 and NO create POST is made.
#  - Step-2 client block (missing/invalid outcome field): assert ZERO create POSTs.
# Error messages are the app's actual re-grounded text (ground-truthed against the live /validate
# endpoint 2026-07-08), which differs from the legacy wording (e.g. legacy "Check Scale does not exist
# in HBS." -> new "Check Scale DDN '<ddn>' does not exist in HBS.").

@chk @UC-CHK-001
Feature: Create Detail Check Scale — Validation

  @S02 @p1
  Scenario: Step 1 blocks a blank Check Scale DDN before any HBS lookup
    Given I am on the Check Scale create form
    When I enter check scale "" and original scale "0172812I12E50"
    And I submit the DDN pair
    Then the "Check Scale DDN" field should show the error "Required."
    And I should remain on the DDN entry step
    And no validation request should be sent

  # Legacy caps the four step-1 inputs in the markup itself (createCheckScale1.jsp: maxlength="13" on
  # checkDDN/origDDN, maxlength="9" on checkDDV/origDDV) so typing simply stops at the limit. Typed
  # character by character, NOT filled — fill() assigns the value directly and bypasses maxlength,
  # which is exactly the behaviour under test.
  @S02 @p1
  Scenario Outline: Step 1 caps <field> at the legacy length
    Given I am on the Check Scale create form
    When I type "<typed>" character by character into the DDN entry field "<field>"
    Then the DDN entry field "<field>" should hold "<kept>"

    Examples:
      | field              | typed              | kept          |
      | Check Scale DDN    | 2103S02700F10EXTRA | 2103S02700F10 |
      | Original Scale DDN | 2103S02700F10EXTRA | 2103S02700F10 |
      | Check Scale DDV    | 1234567890123      | 123456789     |
      | Original Scale DDV | 1234567890123      | 123456789     |

  # DDV is the document VERSION — legacy validated it with OAValidator.isInteger (ERR-003). The new app
  # blocks a non-numeric version client-side, so the write never leaves the browser.
  @S02 @p1
  Scenario Outline: Step 1 blocks a non-numeric <field> before any HBS lookup
    Given I am on the Check Scale create form
    When I enter check scale "2103S02700F10" and original scale "215I812730F40"
    And I set the DDN entry field "<field>" to "abc"
    And I submit the DDN pair
    Then the "<field>" field should show the error "<message>"
    And I should remain on the DDN entry step
    And no validation request should be sent

    Examples:
      | field              | message                              |
      | Check Scale DDV    | Check Scale DDV must be a number.    |
      | Original Scale DDV | Original Scale DDV must be a number. |

  # S02 (not in HBS) + S03 (cannot be the same) need no pre-existing state, so they share this outline.
  # NOSUCH* DDNs are provably absent from LOG_TALLY; 2103S02700F10 is a real active doc used on both
  # sides to trigger only the distinctness error.
  @S02 @S03 @p1
  Scenario Outline: Step 1 rejects an invalid DDN pair — <case>
    Given I am on the Check Scale create form
    When I enter check scale "<checkDdn>" and original scale "<originalDdn>"
    And I submit the DDN pair
    Then the "<field>" field should show the error "<message>"
    And I should remain on the DDN entry step
    And no check scale should be created

    Examples:
      | case                          | checkDdn      | originalDdn   | field           | message                                                    |
      | check DDN not in HBS (S02)    | NOSUCHDDN01   | NOSUCHORG01   | Check Scale DDN | Check Scale DDN 'NOSUCHDDN01' does not exist in HBS.        |
      | check equals original (S03)   | 2103S02700F10 | 2103S02700F10 | Check Scale DDN | Check Scale DDN and Original Scale DDN cannot be the same.  |

  # S03 "already a check": the loaded data has no check scale linked to a log tally, so the scenario
  # first CREATES a check scale on the check DDN (self-contained, cleaned up at the DB), then re-submits
  # that same check DDN and expects the uniqueness rejection.
  @S03 @p1
  Scenario: Step 1 rejects a check DDN that already has a check scale
    Given a check scale already exists for check DDN "212X482G90F00"
    And I am on the Check Scale create form
    When I enter check scale "212X482G90F00" and original scale "215I812730F40"
    And I submit the DDN pair
    Then the "Check Scale DDN" field should show the error "A check scale already exists for Check Scale DDN '212X482G90F00'."
    And I should remain on the DDN entry step
    And no check scale should be created

  # S04 "original at max checks": likewise seed the state — two check scales on the original DDN (the
  # legacy max is 2) — then a third attempt on that original is rejected.
  @S04 @p1
  Scenario: Step 1 rejects an original DDN already at the maximum check scales
    Given the original DDN "216BK82780F10" already has the maximum check scales
    And I am on the Check Scale create form
    When I enter check scale "2209Q42G40F7C" and original scale "216BK82780F10"
    And I submit the DDN pair
    Then the "Original Scale DDN" field should show the error "Maximum check scales already exist for Original Scale DDN '216BK82780F10'."
    And I should remain on the DDN entry step
    And no check scale should be created

  @S05 @p1
  Scenario Outline: Step 2 blocks saving when "<field>" is missing or invalid
    Given I am on the Check Scale create form
    And I complete step 1 to reach the outcome fields
    When I enter valid Check Scale outcome fields
    And I set the outcome field "<field>" to "<value>"
    And I save the check scale
    Then I should see the error "<message>"
    And no check scale should be created

    Examples:
      | field                    | value | message                                    |
      | Check Scale Type         |       | Check Scale Type is required.              |
      | Followed Good Practices  |       | Followed Good Practices is required.       |
      | Original within Standard |       | Original within Standard is required.      |
      | Original Net Value       | abc   | Original Scale Net Value must be a number. |
      | Check Net Value          | abc   | Check Scale Net Value must be a number.    |

  # LEGACY PARITY (verified 2026-08-25) — previously logged as a discovered divergence, now RETRACTED.
  # The ERR-012 "check-scaler != original-scaler" rule (CheckScaleBo.validateScalersNotSame) was wired in
  # legacy ONLY into validateSummaryCheckScale — the SUMMARY create/update path. The DETAIL create path
  # (validateCreateCheckScale -> CheckScaleValidator.validateCreate) never ran it, so legacy PERMITTED a
  # detail check scale whose two log-tally docs resolve to the same scaler. The new detail app matches:
  # it enforces distinct DDN only and creates the record. This scenario asserts that legacy-matching
  # behaviour (the record IS created, same scaler on both sides). The modern SUMMARY path still enforces
  # ERR-012 (SummaryCheckScaleService.validateHeader), preserving parity there. See defects.md
  # "Verified — not a defect". The created row is cleaned up on teardown.
  @S06 @p1
  Scenario: A detail check scale with the same check and original scaler is allowed (legacy parity)
    Given I am on the Check Scale create form
    When I create a check scale with the same scaler on both sides
    Then the same-scaler detail check scale should be created
    And the saved check scale should show the same scaler on both sides
