package ca.bc.gov.nrs.scs.backend.service;

import ca.bc.gov.nrs.scs.backend.model.WelcomeSummary;
import ca.bc.gov.nrs.scs.backend.repository.ClientRepository;
import ca.bc.gov.nrs.scs.backend.repository.OrgUnitRepository;
import ca.bc.gov.nrs.scs.backend.repository.SystemSettingRepository;
import ca.bc.gov.nrs.scs.backend.security.SecurityContextUtils;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.toNullable;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class WelcomeService {

    private final SystemSettingRepository systemSettingRepository;
    private final OrgUnitRepository orgUnitRepository;
    private final ClientRepository clientRepository;

    @Value("${scs.app.version:}")
    private String appVersion;

    @Value("${scs.app.environment:}")
    private String appEnvironment;

    @Value("${scs.app.server-name:}")
    private String serverName;

    @Value("${scs.welcome.system-setting-key:WMSG}")
    private String welcomeSettingKey;

    public WelcomeService(
        SystemSettingRepository systemSettingRepository,
        OrgUnitRepository orgUnitRepository,
        ClientRepository clientRepository) {
        this.systemSettingRepository = systemSettingRepository;
        this.orgUnitRepository = orgUnitRepository;
        this.clientRepository = clientRepository;
    }

    public WelcomeSummary buildWelcomeSummary(NativeWebRequest nativeRequest, String authHeader, Long orgUnitNo) {
        WelcomeSummary summary = new WelcomeSummary();

        summary.setApplicationVersion(toNullable(nullIfBlank(appVersion)));
        summary.setApplicationEnvironment(toNullable(nullIfBlank(appEnvironment)));
        summary.setServerName(toNullable(nullIfBlank(serverName)));

        // User display name and role are provided by the frontend from the JWT; backend no longer supplies them.

        // External (client-restricted) users see their forest client as the Organization (legacy
        // ResourceCache selected-org); internal users see their org unit (region/district).
        String organization = SecurityContextUtils.isClientRestricted()
            ? resolveClientOrganization(SecurityContextUtils.currentUserClientNumber())
            : resolveUserOrganization(orgUnitNo);
        summary.setUserOrganization(toNullable(nullIfBlank(organization)));

        Optional<String> currentNews = systemSettingRepository.findSystemSettingValue(welcomeSettingKey);
        summary.setCurrentNews(toNullable(currentNews.orElse(null)));

        return summary;
    }

    private String resolveUserOrganization(Long orgUnitNo) {
        return orgUnitRepository.findByOrgUnitNo(orgUnitNo)
            .map(record -> {
                String code = record.orgUnitCode();
                String name = record.orgUnitName();
                if (notBlank(code) && notBlank(name)) {
                    return code + " - " + name;
                }
                return notBlank(name) ? name : code;
            })
            .orElse(null);
    }

    /**
     * Organization display for an external (client-restricted) user: {@code {companyName} - {clientNumber}}
     * (legacy {@code ResourceCache} client selected-org). The company name is resolved via SCS's
     * supported client view ({@code scs_client_vw_pkg.search_recs}); falls back to the bare client
     * number when the name is not found.
     */
    private String resolveClientOrganization(String clientNumber) {
        String companyName = clientRepository.findCompanyName(clientNumber);
        return notBlank(companyName) ? companyName + " - " + clientNumber : clientNumber;
    }

    private boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }

    private String nullIfBlank(String value) {
        return notBlank(value) ? value : null;
    }
}
