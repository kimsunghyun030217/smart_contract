package com.p2p.energybackend.service;

import com.p2p.energybackend.model.UserWallet;
import com.p2p.energybackend.repository.UserWalletRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Service
public class UserWalletService {

    private final UserWalletRepository repo;

    public UserWalletService(UserWalletRepository repo) {
        this.repo = repo;
    }

    @Transactional(readOnly = true)
    public WalletResponse getMyWallet(Long userId) {
        // 조회만: 없으면 "가짜 지갑" 반환(저장 안 함)
        UserWallet w = repo.findByUserId(userId).orElseGet(() -> new UserWallet(userId));
        return WalletResponse.from(w);
    }

    // ✅ PoC: total_krw를 사용자가 입력한 값으로 "세팅"
    @Transactional
    public WalletResponse setMyTotalKrw(Long userId, BigDecimal totalKrw) {
        if (totalKrw == null) throw new IllegalArgumentException("totalKrw 필요");
        totalKrw = totalKrw.setScale(2, RoundingMode.HALF_UP);
        if (totalKrw.signum() < 0) throw new IllegalArgumentException("0 이상만 가능");

        UserWallet w = repo.findByUserIdLocked(userId)
                .orElseGet(() -> repo.save(new UserWallet(userId)));

        // locked보다 total을 낮추면 논리 깨짐 → 막기
        if (totalKrw.compareTo(w.getLockedKrw()) < 0) {
            throw new IllegalStateException(
                    "잠긴 금액(locked_krw=" + w.getLockedKrw() + ")보다 total_krw를 낮출 수 없음"
            );
        }

        w.setTotalKrw(totalKrw);

        // ✅ updated_at은 DB가 자동 갱신 (setUpdatedAt 제거)
        repo.save(w);

        return WalletResponse.from(w);
    }

    // ✅ 충전: total_krw += amountKrw
    @Transactional
    public WalletResponse chargeMyWallet(Long userId, BigDecimal amountKrw) {
        if (amountKrw == null) throw new IllegalArgumentException("amountKrw 필요");
        amountKrw = amountKrw.setScale(2, RoundingMode.HALF_UP);
        if (amountKrw.signum() <= 0) throw new IllegalArgumentException("0 초과만 가능");

        UserWallet w = repo.findByUserIdLocked(userId)
                .orElseGet(() -> repo.save(new UserWallet(userId)));

        w.setTotalKrw(w.getTotalKrw().add(amountKrw));

        // ✅ updated_at은 DB가 자동 갱신 (setUpdatedAt 제거)
        repo.save(w);

        // ⚠️ DB가 updated_at을 갱신하지만,
        // 응답에 최신 updated_at이 반드시 필요하면 save 후 refresh가 필요할 수 있음.
        // (대부분은 다음 조회 때 최신 값으로 잘 보임)
        return WalletResponse.from(w);
    }

    // (옵션) 별칭
    @Transactional
    public WalletResponse charge(Long userId, BigDecimal amountKrw) {
        return chargeMyWallet(userId, amountKrw);
    }

    public record WalletResponse(
            BigDecimal totalKrw,
            BigDecimal lockedKrw,
            BigDecimal availableKrw,
            LocalDateTime updatedAt
    ) {
        static WalletResponse from(UserWallet w) {
            return new WalletResponse(
                    w.getTotalKrw(),
                    w.getLockedKrw(),
                    w.getAvailableKrw(),
                    w.getUpdatedAt()
            );
        }
    }
}
