package com.p2p.energybackend.service;

import com.p2p.energybackend.model.User;
import com.p2p.energybackend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class UserService {
    
    @Autowired
    private UserRepository userRepository;
    
    // 회원가입
    public User signup(String username, String password) {
        // 1. 중복 체크
        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("이미 존재하는 아이디입니다.");
        }
        
        // 2. User 객체 생성
        User user = new User(username, password);
        
        // 3. DB에 저장
        return userRepository.save(user);
    }
    
    // 로그인
    public User login(String username, String password) {
        // 1. 사용자 찾기
        Optional<User> userOptional = userRepository.findByUsername(username);
        
        if (!userOptional.isPresent()) {
            throw new RuntimeException("존재하지 않는 아이디입니다.");
        }
        
        User user = userOptional.get();
        
        // 2. 비밀번호 확인
        if (!user.getPassword().equals(password)) {
            throw new RuntimeException("비밀번호가 일치하지 않습니다.");
        }
        
        // 3. 마지막 로그인 시간 업데이트
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);
        
        return user;
    }
    
    // 아이디 중복 체크
    public boolean isUsernameTaken(String username) {
        return userRepository.existsByUsername(username);
    }
}
