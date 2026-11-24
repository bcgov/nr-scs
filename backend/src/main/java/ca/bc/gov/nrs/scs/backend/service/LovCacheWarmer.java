package ca.bc.gov.nrs.scs.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationListener;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.stereotype.Component;

@Component
public class LovCacheWarmer implements ApplicationListener<ContextRefreshedEvent> {

    private static final Logger LOGGER = LoggerFactory.getLogger(LovCacheWarmer.class);

    private final LovService lovService;
    private volatile boolean warmed = false;

    public LovCacheWarmer(LovService lovService) {
        this.lovService = lovService;
    }

    @Override
    public void onApplicationEvent(ContextRefreshedEvent event) {
        // Guard against double-firing (root context + dispatcher servlet context both fire this event).
        if (event.getApplicationContext().getParent() != null) {
            return;
        }

        synchronized (this) {
            if (warmed) {
                return;
            }
            warmed = true;
        }
        LOGGER.info("Pre-warming LOV caches...");
        long start = System.currentTimeMillis();

        // Single-key caches: null fetches all records and is the common dropdown call.
        warm("lov-region-district",              () -> lovService.getRegionDistrictLov(null, null));
        warm("lov-region-district-rollup",       () -> lovService.getRegionDistrictRollupLov(null, null, null));
        warm("lov-appointment-type",             () -> lovService.getAppointmentTypeLov(null, null));
        warm("lov-scale-method-type",            () -> lovService.getScaleMethodTypeLov(null, null));
        warm("lov-grading-code-appointment-type",    () -> lovService.getGradingCodeAppointmentTypeLov());
        warm("lov-grading-code-appointment-type-map", () -> lovService.getGradingCodeAppointmentTypeLovMap());
        warm("lov-scaler-training-type",         () -> lovService.getScalerTrainingTypeLov());
        warm("lov-appointment-type-acting",      () -> lovService.getAppointmentTypeActingMap());
        warm("lov-species-product-grade-xref",   () -> lovService.getSpeciesProductGradeXref());

        // Keyed caches: the cache key is the tableKey/filterField argument, so each distinct
        // call site populates a separate entry. We warm the null key (unfiltered case) here;
        // per-key entries warm on first access since we cannot enumerate all valid keys at startup.
        warm("lov-static",                       () -> lovService.getStaticLov(null));
        warm("lov-template",                     () -> lovService.getTemplateLov(null));

        LOGGER.info("LOV cache warm-up complete ({}ms)", System.currentTimeMillis() - start);
    }

    private void warm(String name, Runnable loader) {
        try {
            loader.run();
            LOGGER.debug("LOV cache populated: {}", name);
        } catch (Exception e) {
            LOGGER.warn("LOV cache warm-up skipped for '{}'", name, e);
        }
    }
}
