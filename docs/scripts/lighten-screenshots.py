#!/usr/bin/env python3
"""Осветление скриншотов тёмной темы для презентации (копии в presentation/).

Подход: плавная инверсия яркости в LAB + нейтрализация «дымки» у фона,
сохранение насыщенных акцентов. Без CLAHE и без жёстких масок (меньше артефактов).
"""

from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "docs" / "screenshots"
DST = SRC / "presentation"

FILES = [
    "Главная страница.png",
    "Проекты.png",
    "Карточка задачи.png",
    "Уведомления.png",
    "Аналитика1.png",
    "Аналитика2.png",
]


def _smoothstep(edge0: float, edge1: float, x: np.ndarray) -> np.ndarray:
    t = np.clip((x - edge0) / (edge1 - edge0 + 1e-6), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def to_light_theme(bgr: np.ndarray) -> np.ndarray:
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    L, a, b = cv2.split(lab)
    x = L / 255.0

    # Непрерывная инверсия L: тёмный фон → светлый, светлый текст → тёмный
    # Степень растёт к бывшим «светлым» пикселям (текст, иконки) — без резких масок
    w_text = _smoothstep(0.42, 0.78, x)
    power = 0.80 + 0.22 * w_text
    L_out = np.power(1.0 - x, power) * 255.0
    L_out = np.clip(L_out * 0.97 + 6.0, 0, 255)

    a_dist = a - 128.0
    b_dist = b - 128.0
    chroma = np.hypot(a_dist, b_dist)
    # Коррекция яркости только у малонасыщенных пикселей (текст, не цветные иконки)
    w_neutral = np.clip(1.0 - chroma / 36.0, 0.0, 1.0)

    # Заголовки и основной текст: мягкий тёмно-серый вместо «чернил»
    w_primary = _smoothstep(0.55, 0.86, x) * w_neutral
    L_soft = 58.0
    L_out = L_out * (1.0 - w_primary * 0.40) + L_soft * (w_primary * 0.40)

    # Мелкие подписи (ОБЗОР, даты, вторичный текст): чуть темнее, не бледные
    w_muted = (
        _smoothstep(0.18, 0.40, x)
        * (1.0 - _smoothstep(0.46, 0.68, x))
        * w_neutral
    )
    L_label = 92.0
    over_light = np.clip((L_out - L_label) / 70.0, 0.0, 1.0) * w_muted
    L_out = L_out - over_light * (L_out - L_label) * 0.62

    # Хрома: серые/фиолетовые фоны → нейтральнее (ближе к белому);
    # насыщенные цвета (иконки P/T/!, зелёные статусы) — сохраняем

    neutral_w = np.clip(1.0 - chroma / 38.0, 0.0, 1.0)
    neutral_w = np.power(neutral_w, 1.25)

    a_out = a - a_dist * neutral_w * 0.90
    b_out = b - b_dist * neutral_w * 0.90

    accent_w = np.clip((chroma - 28.0) / 50.0, 0.0, 1.0)
    boost = 1.12
    a_out = a_out + a_dist * accent_w * (boost - 1.0)
    b_out = b_out + b_dist * accent_w * (boost - 1.0)

    merged = cv2.merge(
        [
            L_out.astype(np.float32),
            np.clip(a_out, 0, 255),
            np.clip(b_out, 0, 255),
        ]
    )
    out = cv2.cvtColor(merged.astype(np.uint8), cv2.COLOR_LAB2BGR)

    out_f = out.astype(np.float32)
    # Светлые малонасыщенные зоны → почти белый фон (убирает лиловую дымку)
    lab_out = cv2.cvtColor(out, cv2.COLOR_BGR2LAB).astype(np.float32)
    Lo, ao, bo = cv2.split(lab_out)
    chroma_o = np.hypot(ao - 128.0, bo - 128.0)
    paper = np.clip((Lo - 165.0) / 55.0, 0.0, 1.0) * np.clip(1.0 - chroma_o / 32.0, 0.0, 1.0)
    paper = np.power(paper, 1.3)[..., None]
    target = np.array([252.0, 252.0, 254.0], dtype=np.float32)  # BGR почти белый
    out_f = out_f * (1.0 - paper * 0.55) + target * (paper * 0.55)

    out = np.clip(out_f, 0, 255).astype(np.uint8)
    out = cv2.convertScaleAbs(out, alpha=1.02, beta=3)

    return out


def main() -> None:
    DST.mkdir(parents=True, exist_ok=True)
    for name in FILES:
        src_path = SRC / name
        if not src_path.exists():
            print(f"SKIP (missing): {name}")
            continue
        bgr = cv2.imdecode(np.fromfile(str(src_path), dtype=np.uint8), cv2.IMREAD_COLOR)
        if bgr is None:
            print(f"FAIL read: {name}")
            continue
        light = to_light_theme(bgr)
        dst_path = DST / name
        ok, buf = cv2.imencode(".png", light)
        if not ok:
            print(f"FAIL encode: {name}")
            continue
        buf.tofile(str(dst_path))
        print(f"OK: {dst_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
