package ca.bc.gov.nrs.scs.backend.model;

import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class Health {
    private String status;

    public Health(String status) {
        this.status = status;
    }
}
