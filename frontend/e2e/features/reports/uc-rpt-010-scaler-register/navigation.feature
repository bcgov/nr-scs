# Re-grounded from UC-RPT-010 S01's FIRST scenario ("opens the Scaler Register Report parameter form"),
# which in legacy asserted the Struts forward `.scalerRegisterReport` (page code R005) and the presence of
# the full control set. Re-grounding: the legacy route `/scalerRegisterReport.do` → the new SPA route
# `/reports/scaler-register` (pages/Reports/ScalerRegister → shared components/core/ReportPage), and the
# Struts forward assertion → the rendered <h1> + the control set the JSP listed. Every control the legacy
# slice enumerated is asserted here by its new-app id: Reg/Dist, Licence Status, Authorization Status,
# Appointment Type Status, From/To Date, Primary/Secondary Sort, File Format, Email Recipient, Preview.
#
# The legacy S08 role-gated-menu scenario is NOT authored (single-role mock auth grants only
# SCS_SYS_ADMIN, so a "menu hidden for other roles" arm is unassertable) — see coverage.md.
# Read-only: opening a parameter form fetches only LOVs and persists nothing → no seed, no cleanup.
@rpt @UC-RPT-010
Feature: Generate Scaler Register Report — Parameter Form

  @S01 @p1
  Scenario: The Scaler Register Report parameter form renders its full control set
    Given I open the "Scaler Register" report
    Then the "Scaler Register" report screen is displayed
    And the report parameter "reg-dist" is displayed
    And the report parameter "licence-status" is displayed
    And the report parameter "auth-status" is displayed
    And the report parameter "appointment-status" is displayed
    And the report parameter "from-date" is displayed
    And the report parameter "to-date" is displayed
    And the report sort order options are displayed
    And the report output options are displayed
