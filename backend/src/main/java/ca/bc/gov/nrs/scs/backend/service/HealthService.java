package ca.bc.gov.nrs.scs.backend.service;

import ca.bc.gov.nrs.scs.backend.model.Health;
import org.springframework.stereotype.Service;

@Service
public class HealthService {

    public Health checkHealth() {
        return new Health("ok");
    }
}
