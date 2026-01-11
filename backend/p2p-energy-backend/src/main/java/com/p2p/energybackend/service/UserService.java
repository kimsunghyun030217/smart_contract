package com.p2p.energybackend.service;

import com.p2p.energybackend.model.User;
import com.p2p.energybackend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

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
    
    // 아이디 중복 체크
    public boolean isUsernameTaken(String username) {
        return userRepository.existsByUsername(username);
    }
}
