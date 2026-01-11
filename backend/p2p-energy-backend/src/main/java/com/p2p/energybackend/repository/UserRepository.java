package com.p2p.energybackend.repository;

import com.p2p.energybackend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    // username으로 사용자 찾기
    Optional<User> findByUsername(String username);
    
    // username 중복 체크
    boolean existsByUsername(String username);
}
