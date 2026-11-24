package ca.bc.gov.nrs.scs.backend.repository;

import static ca.bc.gov.nrs.scs.backend.security.SecurityContextUtils.currentUserIdOrSystem;

import java.util.ArrayList;
import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import ca.bc.gov.nrs.scs.backend.domain.contacts.ClientContactRecord;
import ca.bc.gov.nrs.scs.backend.domain.contacts.ClientContactSearchEntry;
import ca.bc.gov.nrs.scs.backend.domain.contacts.ScaleSiteContactCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.contacts.ScaleSiteContactUpdateCommand;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteContactRecord;
import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;

@Repository
public class ScaleSiteContactRepository extends AbstractRepository {

  private static final String CONTACT_VW_PKG = "scs_scale_site_contact_vw_pkg";
  private static final String CONTACT_PKG = "scs_scale_site_contact_pkg";
  private static final String CLIENT_CONTACT_PKG = "scs_client_contact_pkg";

  /** Client-contact search is always scoped to the "SI" (site information) business contact code. */
  private static final String ALLOWED_BUS_CONTACT_CODE = "SI";

  public ScaleSiteContactRepository(JdbcTemplate jdbcTemplate) {
    super(jdbcTemplate);
  }

  /**
   * Returns all contacts for a scale site using the view package (joined with CLIENT_CONTACT).
   * search_recs has 11 input params:
   *   p_client_contact_id, p_scale_site_id_nmbr, p_primary_contact_ind,
   *   p_contact_name, p_contact_role_desc, p_business_phone, p_fax_number,
   *   p_email_address, p_site_information_accss_nd, p_primary_sort, p_secondary_sort
   */
  public List<ScaleSiteContactRecord> getContactsForSite(String scaleSiteIdNmbr) {
    return queryCursorCall(buildSearchRecsCall(CONTACT_VW_PKG, 11),
        cs -> ParameterBinder.afterReturn(cs)
            .nullNumeric()                   // p_client_contact_id
            .string(scaleSiteIdNmbr)         // p_scale_site_id_nmbr
            .nullString()                    // p_primary_contact_ind
            .nullString()                    // p_contact_name
            .nullString()                    // p_contact_role_desc
            .nullString()                    // p_business_phone
            .nullString()                    // p_fax_number
            .nullString()                    // p_email_address
            .nullString()                    // p_site_information_accss_nd
            .intValue(1)                     // p_primary_sort (primary first)
            .nullNumeric(),                  // p_secondary_sort
        rs -> {
          List<ScaleSiteContactRecord> out = new ArrayList<>();
          while (rs.next()) {
            out.add(new ScaleSiteContactRecord(
                getLongNullable(rs, "client_contact_id"),
                rs.getString("scale_site_id_nmbr"),
                YesNo.fromCode(rs.getString("primary_contact_ind")),
                rs.getString("contact_name"),
                rs.getString("contact_role_desc"),
                rs.getString("business_phone"),
                null,   // cellPhone not in view
                rs.getString("fax_number"),
                rs.getString("email_address"),
                YesNo.fromCode(rs.getString("site_information_access_ind")),
                null,   // effectiveDate not in view
                null,   // expiryDate not in view
                null, null, null, null, null
            ));
          }
          return out;
        });
  }

  /**
   * Gets a single contact record from SCALE_SITE_CONTACT (role, access, dates, audit). The
   * CLIENT_CONTACT person fields (name, phones, email) are not stored here and are left null;
   * the service enriches them via {@link #getClientContact(Long)} only for the contact view, so
   * existence checks and write-reloads stay a single round-trip.
   * select_rec has 2 input params: in_scale_site_id_nmbr, in_client_contact_id
   */
  public ScaleSiteContactRecord getContact(String scaleSiteIdNmbr, Long clientContactId) {
    return queryCursorCall(buildSelectRecCall(CONTACT_PKG, 2),
        cs -> ParameterBinder.afterReturn(cs)
            .string(scaleSiteIdNmbr)
            .longValue(clientContactId),
        rs -> {
          if (rs == null || !rs.next()) return null;
          return new ScaleSiteContactRecord(
              getLongNullable(rs, "client_contact_id"),
              rs.getString("scale_site_id_nmbr"),
              YesNo.fromCode(rs.getString("primary_contact_ind")),
              null,  // contact_name — CLIENT_CONTACT field, see getClientContact
              rs.getString("contact_role_description"),
              null,  // business_phone — CLIENT_CONTACT field, see getClientContact
              null,  // cell_phone — CLIENT_CONTACT field, see getClientContact
              null,  // fax_number — CLIENT_CONTACT field, see getClientContact
              null,  // email_address — CLIENT_CONTACT field, see getClientContact
              YesNo.fromCode(rs.getString("site_information_access_ind")),
              getLocalDateNullable(rs, "effective_date"),
              getLocalDateNullable(rs, "expiry_date"),
              getOffsetDateTimeNullable(rs, "entry_timestamp"),
              rs.getString("entry_userid"),
              getOffsetDateTimeNullable(rs, "update_timestamp"),
              rs.getString("update_userid"),
              getLongNullable(rs, "revision_count")
          );
        });
  }

  /**
   * Loads a single CLIENT_CONTACT person record (name, phones, email), or null when not found.
   * scs_client_contact_pkg.select_rec has 1 input param: in_client_contact_id, and returns the
   * client_contact_cur cursor (includes cell_phone, fax_number, business_phone, email_address).
   */
  public ClientContactRecord getClientContact(Long clientContactId) {
    if (clientContactId == null) {
      return null;
    }
    return queryCursorCall(buildSelectRecCall(CLIENT_CONTACT_PKG, 1),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(clientContactId),
        rs -> {
          if (rs == null || !rs.next()) return null;
          return new ClientContactRecord(
              getLongNullable(rs, "client_contact_id"),
              rs.getString("contact_name"),
              rs.getString("business_phone"),
              rs.getString("cell_phone"),
              rs.getString("fax_number"),
              rs.getString("email_address"));
        });
  }

  /**
   * Inserts a new scale site contact record.
   * insert_rec has 9 input params:
   *   in_scale_site_id_nmbr, in_client_contact_id, in_contact_role_description,
   *   in_primary_contact_ind, in_site_information_accss_nd, in_effective_date,
   *   in_expiry_date, in_entry_userid, in_update_userid
   */
  public void insertContact(String scaleSiteIdNmbr, ScaleSiteContactCreateCommand command) {
    final String userId = currentUserIdOrSystem();
    queryCursorCall(buildInsertRecCall(CONTACT_PKG, 9),
        cs -> ParameterBinder.afterReturn(cs)
            .string(scaleSiteIdNmbr)
            .longValue(command.clientContactId())
            .string(command.contactRoleDescription())
            .string(YesNo.toCode(command.primaryContactInd()))
            .string(YesNo.toCode(command.siteInformationAccessInd()))
            .date(command.effectiveDate())
            .date(command.expiryDate())
            .string(userId)
            .string(userId),
        rs -> null);
  }

  /**
   * Updates an existing scale site contact record.
   * update_rec has 9 input params:
   *   in_scale_site_id_nmbr, in_client_contact_id, in_contact_role_description,
   *   in_primary_contact_ind, in_site_information_accss_nd, in_effective_date,
   *   in_expiry_date, in_entry_userid, in_update_userid
   */
  public void updateContact(
      String scaleSiteIdNmbr, Long clientContactId, ScaleSiteContactUpdateCommand command) {
    final String userId = currentUserIdOrSystem();
    queryCursorCall(buildUpdateRecCall(CONTACT_PKG, 9),
        cs -> ParameterBinder.afterReturn(cs)
            .string(scaleSiteIdNmbr)
            .longValue(clientContactId)
            .string(command.contactRoleDescription())
            .string(YesNo.toCode(command.primaryContactInd()))
            .string(YesNo.toCode(command.siteInformationAccessInd()))
            .date(command.effectiveDate())
            .date(command.expiryDate())
            .string(userId)
            .string(userId),
        rs -> null);
  }

  /**
   * Deletes a scale site contact record.
   * delete_rec has 2 input params: in_scale_site_id_nmbr, in_client_contact_id
   */
  public void deleteContact(String scaleSiteIdNmbr, Long clientContactId) {
    executeVoidCall(buildDeleteRecCall(CONTACT_PKG, 2),
        cs -> ParameterBinder.fromStart(cs)
            .string(scaleSiteIdNmbr)
            .longValue(clientContactId));
  }

  /**
   * Searches client contacts, always filtering to bus_contact_code = 'SI'.
   * search_recs has 14 input params:
   *   p_client_contact_id, p_client_number, p_client_locn_code, p_bus_contact_code,
   *   p_contact_name, p_business_phone, p_cell_phone, p_fax_number, p_email_address,
   *   p_update_userid, p_update_org_unit, p_add_timestamp, p_add_userid, p_add_org_unit
   */
  public List<ClientContactSearchEntry> searchClientContacts(
      Long clientContactId, String clientNumber, String clientLocnCode, String contactName) {
    return queryCursorCall(buildSearchRecsCall(CLIENT_CONTACT_PKG, 14),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(clientContactId)             // p_client_contact_id
            .string(clientNumber)                   // p_client_number
            .string(clientLocnCode)                 // p_client_locn_code
            .string(ALLOWED_BUS_CONTACT_CODE)       // p_bus_contact_code — always filter to SI
            .string(contactName)                    // p_contact_name
            .nullString()                           // p_business_phone
            .nullString()                           // p_cell_phone
            .nullString()                           // p_fax_number
            .nullString()                           // p_email_address
            .nullString()                           // p_update_userid
            .nullString()                           // p_update_org_unit
            .nullTimestamp()                        // p_add_timestamp
            .nullString()                           // p_add_userid
            .nullString(),                          // p_add_org_unit
        rs -> {
          List<ClientContactSearchEntry> out = new ArrayList<>();
          while (rs.next()) {
            out.add(new ClientContactSearchEntry(
                getLongNullable(rs, "client_contact_id"),
                rs.getString("contact_name"),
                rs.getString("client_number"),
                rs.getString("client_locn_code"),
                rs.getString("business_phone"),
                rs.getString("email_address")
            ));
          }
          return out;
        });
  }

  /**
   * Returns true if a primary contact (primaryContactInd = Y) already exists for this site.
   */
  public boolean primaryContactExists(String scaleSiteIdNmbr) {
    List<ScaleSiteContactRecord> contacts = getContactsForSite(scaleSiteIdNmbr);
    return contacts.stream().anyMatch(c -> c.primaryContactInd() == YesNo.Y);
  }

  /**
   * Returns true if the given client contact is already associated with this scale site.
   */
  public boolean contactExists(String scaleSiteIdNmbr, Long clientContactId) {
    return getContact(scaleSiteIdNmbr, clientContactId) != null;
  }

  public boolean clientContactExists(Long clientContactId) {
    if (clientContactId == null) {
      return false;
    }
    return !searchClientContacts(clientContactId, null, null, null).isEmpty();
  }
}
