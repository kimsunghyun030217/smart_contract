package com.p2p.energybackend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class P2pEnergyBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(P2pEnergyBackendApplication.class, args);
	}

}
