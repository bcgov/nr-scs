# Re-grounded from UC-SCL-003 S09 (View Address tab, read-only). In the new app the Address tab lives on
# the View Scaler screen (ScalerTabs → AddressTab), rendering a display-only table sourced from CLIMS — no
# inputs, no save button. Opens the REAL anchor scaler READ-ONLY (nothing persists). Anchor licence no
# pinned in fixtures/scl/scaler-edit-test-data.ts.
@scl @UC-SCL-003
Feature: Update Scaler — Address Tab

  @S09 @p2
  Scenario: The Address tab is read-only
    Given I open the sample scaler view
    When I open the Address tab
    Then the address information is shown read-only
