package ca.bc.gov.nrs.scs.backend.repository;

import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import ca.bc.gov.nrs.scs.backend.domain.shared.OrgUnitRecord;
import ca.bc.gov.nrs.scs.backend.domain.shared.RegionDistrict;

@Repository
public class OrgUnitRepository extends AbstractRepository {

    private static final String ORG_UNIT_PKG = "scs_org_unit_pkg";


    public OrgUnitRepository(JdbcTemplate jdbcTemplate) {
        super(jdbcTemplate);
    }

    public Optional<OrgUnitRecord> findByOrgUnitNo(Long orgUnitNo) {
        if (orgUnitNo == null) {
            return Optional.empty();
        }

        return queryCursorCall(buildSelectRecCall(ORG_UNIT_PKG, 1),
            cs -> ParameterBinder.afterReturn(cs)
                .longValue(orgUnitNo),
            rs -> {
                if (rs == null || !rs.next()) {
                    return Optional.empty();
                }
                Long orgUnitNoValue = rs.getLong(1);
                if (rs.wasNull()) {
                    orgUnitNoValue = null;
                }
                String orgUnitCode = rs.getString(2);
                String orgUnitName = rs.getString(3);
                return Optional.of(new OrgUnitRecord(orgUnitNoValue, orgUnitCode, orgUnitName));
            });
    }

    /**
     * Resolve the region and district names for a district org unit. The given org unit is the
     * district; its {@code rollup_region_no} points at the region org unit. Two sequential
     * {@code select_rec} lookups (district then region) avoid nesting JDBC calls.
     */
    public Optional<RegionDistrict> findRegionDistrict(Long districtOrgUnitNo) {
        if (districtOrgUnitNo == null) {
            return Optional.empty();
        }

        DistrictRow district = queryCursorCall(buildSelectRecCall(ORG_UNIT_PKG, 1),
            cs -> cs.setLong(2, districtOrgUnitNo),
            rs -> {
                if (rs == null || !rs.next()) {
                    return null;
                }
                return new DistrictRow(rs.getString(3), getLongNullable(rs, 9));
            });

        if (district == null) {
            return Optional.empty();
        }

        String regionName = district.rollupRegionNo() == null ? null
            : queryCursorCall(buildSelectRecCall(ORG_UNIT_PKG, 1),
                cs -> cs.setLong(2, district.rollupRegionNo()),
                rs -> (rs != null && rs.next()) ? rs.getString(3) : null);

        return Optional.of(new RegionDistrict(regionName, district.districtName()));
    }

    /** Transient holder for the district lookup before the region name is resolved. */
    private record DistrictRow(String districtName, Long rollupRegionNo) {}
}
