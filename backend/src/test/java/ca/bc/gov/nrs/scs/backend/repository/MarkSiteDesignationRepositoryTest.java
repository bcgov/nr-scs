package ca.bc.gov.nrs.scs.backend.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.domain.marksitedesignation.MarkSiteDesignationSearchResult;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthCondition;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.Date;
import java.sql.ResultSet;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.LinkedList;
import java.util.List;
import java.util.Queue;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.CallableStatementCreator;
import org.springframework.jdbc.core.JdbcTemplate;

class MarkSiteDesignationRepositoryTest {

  @Test
  void searchByTimberMark_bindsTimberMarkAndMapsRows() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    MarkSiteDesignationRepository repository = new MarkSiteDesignationRepository(jdbcTemplate);

    ResultSet rs = searchResultSet();
    AtomicReference<CallableStatement> captured = new AtomicReference<>();
    stubJdbcExecute(jdbcTemplate, rs, captured);

    List<MarkSiteDesignationSearchResult> items = repository.searchByTimberMark("AB1234");

    assertEquals(1, items.size());
    MarkSiteDesignationSearchResult item = items.get(0);
    assertEquals(5001L, item.haulingMarkAuthorizationId());
    assertEquals("AB1234", item.timberMark());
    assertEquals(LocalDate.of(2025, 1, 15), item.effectiveDate());
    assertEquals(LocalDate.of(2027, 1, 15), item.expiryDate());
    assertEquals("Cariboo Region", item.orgUnitName());

    // search_recs binds the timber mark at parameter position 3 (cursor is position 1).
    assertNotNull(captured.get());
    verify(captured.get()).setString(3, "AB1234");
  }

  private void stubJdbcExecute(
      JdbcTemplate jdbcTemplate,
      ResultSet rs,
      AtomicReference<CallableStatement> captured) {
    when(jdbcTemplate.execute(any(CallableStatementCreator.class), any(CallableStatementCallback.class)))
        .thenAnswer(invocation -> {
          CallableStatementCreator creator = invocation.getArgument(0);
          CallableStatementCallback<?> callback = invocation.getArgument(1);

          Connection con = mock(Connection.class);
          CallableStatement cs = mock(CallableStatement.class);
          when(con.prepareCall(anyString())).thenReturn(cs);
          captured.set(cs);

          creator.createCallableStatement(con);
          when(cs.getObject(1)).thenReturn(rs);

          return callback.doInCallableStatement(cs);
        });
  }

  // --- getMarkSiteDesignationConditions: mandatory-inject + merge/dedupe/sort contract ----------------
  // The frontend's stripping of ministryStandardInd='Y' from update payloads depends on the backend ALWAYS
  // re-injecting mandatory conditions on read (and update deleting only non-mandatory links). These lock it.

  @Test
  void getConditions_alwaysInjectsMandatory_whenNoLinkedConditions() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    MarkSiteDesignationRepository repository = new MarkSiteDesignationRepository(jdbcTemplate);

    // execute order for getMarkSiteDesignationConditions: (1) linked keys -> empty, (2) mandatory -> [185].
    stubSequencedExecute(jdbcTemplate, List.of(emptyResultSet(), conditionResultSet("MSD", 185L, "Y", 0)));

    List<ScaleAuthCondition> conditions = repository.getMarkSiteDesignationConditions(42L);

    assertEquals(1, conditions.size());
    assertEquals(Long.valueOf(185L), conditions.get(0).getScaleAuthConditionId());
    assertEquals("Y", conditions.get(0).getMinistryStandardInd());
  }

  @Test
  void getConditions_mergesLinked_dedupesMandatory_andSortsBySortOrder() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    MarkSiteDesignationRepository repository = new MarkSiteDesignationRepository(jdbcTemplate);

    // execute order: (1) keys -> [(MSD,185),(MSD,190)], (2) mandatory -> [185 sort 0],
    // (3) linked lookup 185 -> 185 sort 0 (a duplicate of the mandatory), (4) linked lookup 190 -> 190 sort 2.
    stubSequencedExecute(jdbcTemplate, List.of(
        keysResultSet185And190(),
        conditionResultSet("MSD", 185L, "Y", 0),
        conditionResultSet("MSD", 185L, "Y", 0),
        conditionResultSet("MSD", 190L, "N", 2)));

    List<ScaleAuthCondition> conditions = repository.getMarkSiteDesignationConditions(42L);

    assertEquals(2, conditions.size()); // 185 (mandatory) is not duplicated by the linked 185
    assertEquals(Long.valueOf(185L), conditions.get(0).getScaleAuthConditionId()); // sort 0 first
    assertEquals(Long.valueOf(190L), conditions.get(1).getScaleAuthConditionId()); // sort 2 second
  }

  /** Feed a distinct cursor (ResultSet) to each successive jdbcTemplate.execute call, in order. */
  private void stubSequencedExecute(JdbcTemplate jdbcTemplate, List<ResultSet> cursors) {
    Queue<ResultSet> queue = new LinkedList<>(cursors);
    when(jdbcTemplate.execute(any(CallableStatementCreator.class), any(CallableStatementCallback.class)))
        .thenAnswer(invocation -> {
          CallableStatementCreator creator = invocation.getArgument(0);
          CallableStatementCallback<?> callback = invocation.getArgument(1);

          Connection con = mock(Connection.class);
          CallableStatement cs = mock(CallableStatement.class);
          when(con.prepareCall(anyString())).thenReturn(cs);
          creator.createCallableStatement(con);
          when(cs.getObject(1)).thenReturn(queue.poll());

          return callback.doInCallableStatement(cs);
        });
  }

  @Test
  void addMarkSiteScaleSites_skipsNullAndBlankEntries_issuesNoJdbcCall() {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    MarkSiteDesignationRepository repository = new MarkSiteDesignationRepository(jdbcTemplate);

    repository.addMarkSiteScaleSites(42L, Arrays.asList(" ", null, ""));

    verify(jdbcTemplate, never())
        .execute(any(CallableStatementCreator.class), any(CallableStatementCallback.class));
  }

  @Test
  void addMarkSiteScaleSites_issuesOneJdbcCallPerValidEntry() {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    MarkSiteDesignationRepository repository = new MarkSiteDesignationRepository(jdbcTemplate);

    repository.addMarkSiteScaleSites(42L, List.of("AB1", "CD2"));

    verify(jdbcTemplate, org.mockito.Mockito.times(2))
        .execute(any(CallableStatementCreator.class), any(CallableStatementCallback.class));
  }

  @Test
  void addMarkSiteExceptions_skipsNullAndBlankEntries_issuesNoJdbcCall() {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    MarkSiteDesignationRepository repository = new MarkSiteDesignationRepository(jdbcTemplate);

    repository.addMarkSiteExceptions(42L, Arrays.asList(" ", null, ""));

    verify(jdbcTemplate, never())
        .execute(any(CallableStatementCreator.class), any(CallableStatementCallback.class));
  }

  @Test
  void addMarkSiteExceptions_issuesOneJdbcCallPerValidEntry() {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    MarkSiteDesignationRepository repository = new MarkSiteDesignationRepository(jdbcTemplate);

    repository.addMarkSiteExceptions(42L, List.of("21", "22"));

    verify(jdbcTemplate, org.mockito.Mockito.times(2))
        .execute(any(CallableStatementCreator.class), any(CallableStatementCallback.class));
  }

  @Test
  void getMarkSiteDesignationExceptions_readsExemptCodeFromCursorColumnTwo() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    MarkSiteDesignationRepository repository = new MarkSiteDesignationRepository(jdbcTemplate);

    ResultSet rs = exceptionResultSet("21", "22");
    AtomicReference<CallableStatement> captured = new AtomicReference<>();
    stubJdbcExecute(jdbcTemplate, rs, captured);

    List<String> codes = repository.getMarkSiteDesignationExceptions(42L);

    assertEquals(List.of("21", "22"), codes);
    // search_recs binds the authorization id at parameter position 2 (cursor is position 1).
    assertNotNull(captured.get());
    verify(captured.get()).setLong(2, 42L);
  }

  /** A two-row DesignatedExemptMarkMethod cursor: col 1 = authorization id, col 2 = exempt mark method code. */
  private ResultSet exceptionResultSet(String firstCode, String secondCode) throws Exception {
    ResultSet rs = mock(ResultSet.class);
    when(rs.next()).thenReturn(true, true, false);
    when(rs.getString(2)).thenReturn(firstCode, secondCode);
    return rs;
  }

  private ResultSet emptyResultSet() throws Exception {
    ResultSet rs = mock(ResultSet.class);
    when(rs.next()).thenReturn(false);
    return rs;
  }

  /** A linked-condition-keys cursor with two keys: (MSD,185) then (MSD,190). Cols read: 2=class, 3=id. */
  private ResultSet keysResultSet185And190() throws Exception {
    ResultSet rs = mock(ResultSet.class);
    when(rs.next()).thenReturn(true, true, false);
    when(rs.getString(2)).thenReturn("MSD", "MSD");
    when(rs.getObject(3)).thenReturn(185L, 190L);
    when(rs.getLong(3)).thenReturn(185L, 190L);
    return rs;
  }

  /** A single-row ScaleAuthCondition cursor (mapScaleAuthCondition reads columns by name). */
  private ResultSet conditionResultSet(String classCode, long id, String ministryStandardInd, int sortOrder)
      throws Exception {
    ResultSet rs = mock(ResultSet.class);
    when(rs.next()).thenReturn(true, false);
    when(rs.getString("scale_condition_class_code")).thenReturn(classCode);
    when(rs.getObject("scale_auth_condition_id")).thenReturn(id);
    when(rs.getLong("scale_auth_condition_id")).thenReturn(id);
    when(rs.getString("ministry_standard_ind")).thenReturn(ministryStandardInd);
    when(rs.getObject("sort_order_no")).thenReturn(sortOrder);
    when(rs.getInt("sort_order_no")).thenReturn(sortOrder);
    return rs;
  }

  private ResultSet searchResultSet() throws Exception {
    ResultSet rs = mock(ResultSet.class);
    when(rs.next()).thenReturn(true, false);
    when(rs.getObject(1)).thenReturn(5001L);
    when(rs.getString(2)).thenReturn("AB1234");
    when(rs.getDate(3)).thenReturn(Date.valueOf(LocalDate.of(2025, 1, 15)));
    when(rs.getDate(4)).thenReturn(Date.valueOf(LocalDate.of(2027, 1, 15)));
    when(rs.getString(5)).thenReturn("Cariboo Region");
    return rs;
  }
}
