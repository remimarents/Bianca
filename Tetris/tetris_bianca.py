from __future__ import annotations

import argparse
import json
import math
import random
from array import array
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

import pygame


WINDOW_WIDTH = 920
WINDOW_HEIGHT = 760
PLAYFIELD_WIDTH = 10
PLAYFIELD_HEIGHT = 20
BLOCK_SIZE = 30
PLAY_X = 70
PLAY_Y = 80
SIDE_X = PLAY_X + PLAYFIELD_WIDTH * BLOCK_SIZE + 40
SCORE_FILE = Path(__file__).with_name("bianca_highscores.json")
MAX_HIGHSCORES = 5

BACKGROUND = (255, 246, 250)
PANEL = (255, 255, 255)
TEXT = (87, 73, 104)
GRID = (238, 221, 232)
FRAME = (255, 173, 204)
ACCENT = (163, 229, 255)
SHADOW = (232, 178, 208)

COLORS = {
    "I": (118, 215, 255),
    "J": (143, 176, 255),
    "L": (255, 186, 122),
    "O": (255, 227, 118),
    "S": (149, 232, 166),
    "T": (214, 167, 255),
    "Z": (255, 146, 173),
}

PIECES = {
    "I": [
        ["....", "XXXX", "....", "...."],
        ["..X.", "..X.", "..X.", "..X."],
    ],
    "J": [
        ["X..", "XXX", "..."],
        [".XX", ".X.", ".X."],
        ["...", "XXX", "..X"],
        [".X.", ".X.", "XX."],
    ],
    "L": [
        ["..X", "XXX", "..."],
        [".X.", ".X.", ".XX"],
        ["...", "XXX", "X.."],
        ["XX.", ".X.", ".X."],
    ],
    "O": [
        ["XX", "XX"],
    ],
    "S": [
        [".XX", "XX.", "..."],
        [".X.", ".XX", "..X"],
    ],
    "T": [
        [".X.", "XXX", "..."],
        [".X.", ".XX", ".X."],
        ["...", "XXX", ".X."],
        [".X.", "XX.", ".X."],
    ],
    "Z": [
        ["XX.", ".XX", "..."],
        ["..X", ".XX", ".X."],
    ],
}

SCORES_BY_LINES = {0: 0, 1: 100, 2: 300, 3: 500, 4: 800}


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


@dataclass
class Tetromino:
    shape: str
    rotation: int = 0
    x: int = 3
    y: int = 0

    @property
    def matrix(self) -> list[str]:
        rotations = PIECES[self.shape]
        return rotations[self.rotation % len(rotations)]

    def cells(self) -> list[tuple[int, int]]:
        result: list[tuple[int, int]] = []
        for row_index, row in enumerate(self.matrix):
            for col_index, value in enumerate(row):
                if value == "X":
                    result.append((self.x + col_index, self.y + row_index))
        return result

    def rotated(self, direction: int = 1) -> "Tetromino":
        return Tetromino(
            shape=self.shape,
            rotation=(self.rotation + direction) % len(PIECES[self.shape]),
            x=self.x,
            y=self.y,
        )

    def moved(self, dx: int = 0, dy: int = 0) -> "Tetromino":
        return Tetromino(
            shape=self.shape,
            rotation=self.rotation,
            x=self.x + dx,
            y=self.y + dy,
        )


class HighscoreStore:
    def __init__(self, path: Path) -> None:
        self.path = path

    def load(self) -> list[dict[str, str | int]]:
        if not self.path.exists():
            return []
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
            if isinstance(data, list):
                cleaned = []
                for entry in data[:MAX_HIGHSCORES]:
                    if isinstance(entry, dict):
                        cleaned.append(
                            {
                                "name": str(entry.get("name", "Spiller"))[:12],
                                "score": int(entry.get("score", 0)),
                                "date": str(entry.get("date", "")),
                            }
                        )
                return cleaned
        except (OSError, ValueError, TypeError):
            return []
        return []

    def qualifies(self, score: int) -> bool:
        scores = self.load()
        return len(scores) < MAX_HIGHSCORES or score > int(scores[-1]["score"])

    def save_score(self, name: str, score: int) -> list[dict[str, str | int]]:
        scores = self.load()
        safe_name = (name.strip() or "Spiller")[:12]
        scores.append({"name": safe_name, "score": score, "date": datetime.now().strftime("%d.%m.%Y")})
        scores.sort(key=lambda item: int(item["score"]), reverse=True)
        scores = scores[:MAX_HIGHSCORES]
        self.path.write_text(json.dumps(scores, indent=2), encoding="utf-8")
        return scores


class SoundBank:
    def __init__(self) -> None:
        self.enabled = False
        self.sounds: dict[str, pygame.mixer.Sound] = {}
        try:
            pygame.mixer.init(frequency=44100, size=-16, channels=1)
            self.enabled = True
        except pygame.error:
            self.enabled = False
        if self.enabled:
            self.sounds = {
                "move": self._make_tone(600, 0.05, volume=0.16, waveform="sine"),
                "rotate": self._make_tone(760, 0.05, volume=0.16, waveform="triangle"),
                "drop": self._make_tone(430, 0.08, volume=0.18, waveform="square"),
                "clear": self._make_tone(920, 0.18, volume=0.22, waveform="sine", vibrato=True),
                "game_over": self._make_descending(),
            }

    def _make_tone(
        self,
        frequency: float,
        duration: float,
        *,
        volume: float,
        waveform: str,
        vibrato: bool = False,
    ) -> pygame.mixer.Sound:
        sample_rate = 44100
        samples = int(sample_rate * duration)
        buffer = array("h")
        for i in range(samples):
            t = i / sample_rate
            current_frequency = frequency * (1 + (0.03 * math.sin(2 * math.pi * 12 * t) if vibrato else 0))
            if waveform == "square":
                value = 1.0 if math.sin(2 * math.pi * current_frequency * t) >= 0 else -1.0
            elif waveform == "triangle":
                value = 2 * abs(2 * ((t * current_frequency) % 1) - 1) - 1
            else:
                value = math.sin(2 * math.pi * current_frequency * t)
            envelope = min(1.0, t * 40) * min(1.0, (duration - t) * 25)
            sample = int(32767 * clamp(value * volume * envelope, -1.0, 1.0))
            buffer.append(sample)
        return pygame.mixer.Sound(buffer=buffer.tobytes())

    def _make_descending(self) -> pygame.mixer.Sound:
        sample_rate = 44100
        duration = 0.4
        samples = int(sample_rate * duration)
        buffer = array("h")
        start = 480
        end = 180
        for i in range(samples):
            t = i / sample_rate
            frequency = start + (end - start) * (t / duration)
            value = math.sin(2 * math.pi * frequency * t)
            envelope = min(1.0, t * 20) * min(1.0, (duration - t) * 9)
            buffer.append(int(32767 * value * 0.22 * envelope))
        return pygame.mixer.Sound(buffer=buffer.tobytes())

    def play(self, name: str) -> None:
        if self.enabled and name in self.sounds:
            self.sounds[name].play()


class TetrisGame:
    def __init__(self) -> None:
        self.highscores = HighscoreStore(SCORE_FILE)
        self.score_table = self.highscores.load()
        self.sound = SoundBank()
        self.random = random.Random()
        self.font_small = pygame.font.SysFont("arial", 20)
        self.font_normal = pygame.font.SysFont("arial", 28, bold=True)
        self.font_big = pygame.font.SysFont("arial", 46, bold=True)
        self.font_title = pygame.font.SysFont("comicsansms", 42, bold=True)
        self.reset()

    def reset(self) -> None:
        self.board: list[list[str | None]] = [
            [None for _ in range(PLAYFIELD_WIDTH)] for _ in range(PLAYFIELD_HEIGHT)
        ]
        self.score = 0
        self.lines = 0
        self.level = 1
        self.game_over = False
        self.saved_score = False
        self.awaiting_name = False
        self.name_input = ""
        self.new_highscore = False
        self.bag: list[str] = []
        self.current_piece = self._next_piece()
        self.next_piece = self._next_piece()
        self.drop_timer = 0.0
        self.soft_drop = False
        self.move_hold = {"left": 0.0, "right": 0.0, "down": 0.0}
        self.sparkle_phase = 0.0

    def _fill_bag(self) -> None:
        self.bag = list(PIECES.keys())
        self.random.shuffle(self.bag)

    def _next_piece(self) -> Tetromino:
        if not self.bag:
            self._fill_bag()
        shape = self.bag.pop()
        return Tetromino(shape=shape, x=3, y=0)

    def _valid(self, piece: Tetromino) -> bool:
        for x, y in piece.cells():
            if x < 0 or x >= PLAYFIELD_WIDTH or y >= PLAYFIELD_HEIGHT:
                return False
            if y >= 0 and self.board[y][x] is not None:
                return False
        return True

    def _lock_piece(self) -> None:
        for x, y in self.current_piece.cells():
            if y < 0:
                self._trigger_game_over()
                return
            self.board[y][x] = self.current_piece.shape

        cleared = self._clear_lines()
        self.score += SCORES_BY_LINES[cleared] * self.level
        self.lines += cleared
        self.level = 1 + self.lines // 10
        if cleared:
            self.sound.play("clear")
        self.current_piece = self.next_piece
        self.next_piece = self._next_piece()
        if not self._valid(self.current_piece):
            self._trigger_game_over()

    def _clear_lines(self) -> int:
        remaining = [row for row in self.board if any(cell is None for cell in row)]
        cleared = PLAYFIELD_HEIGHT - len(remaining)
        while len(remaining) < PLAYFIELD_HEIGHT:
            remaining.insert(0, [None for _ in range(PLAYFIELD_WIDTH)])
        self.board = remaining
        return cleared

    def _trigger_game_over(self) -> None:
        if not self.game_over:
            self.game_over = True
            self.sound.play("game_over")
            if not self.saved_score:
                self.new_highscore = self.highscores.qualifies(self.score)
                self.awaiting_name = self.new_highscore
                if not self.new_highscore:
                    self.saved_score = True

    def submit_highscore_name(self) -> None:
        if not self.awaiting_name or self.saved_score:
            return
        self.score_table = self.highscores.save_score(self.name_input, self.score)
        self.awaiting_name = False
        self.saved_score = True

    def handle_name_input(self, event: pygame.event.Event) -> None:
        if not self.awaiting_name or event.type != pygame.KEYDOWN:
            return
        if event.key == pygame.K_RETURN:
            self.submit_highscore_name()
        elif event.key == pygame.K_BACKSPACE:
            self.name_input = self.name_input[:-1]
        else:
            character = event.unicode
            if character and character.isprintable() and len(self.name_input) < 12:
                self.name_input += character

    def _move(self, dx: int, dy: int) -> bool:
        trial = self.current_piece.moved(dx, dy)
        if self._valid(trial):
            self.current_piece = trial
            return True
        return False

    def move_left(self) -> None:
        if self._move(-1, 0):
            self.sound.play("move")

    def move_right(self) -> None:
        if self._move(1, 0):
            self.sound.play("move")

    def move_down(self) -> bool:
        if self._move(0, 1):
            return True
        self._lock_piece()
        return False

    def hard_drop(self) -> None:
        dropped = 0
        while self._move(0, 1):
            dropped += 1
        self.score += dropped * 2
        self.sound.play("drop")
        self._lock_piece()

    def rotate(self) -> None:
        rotated = self.current_piece.rotated()
        for dx in (0, -1, 1, -2, 2):
            trial = rotated.moved(dx, 0)
            if self._valid(trial):
                self.current_piece = trial
                self.sound.play("rotate")
                return

    def update(self, dt: float, keys: pygame.key.ScancodeWrapper) -> None:
        if self.game_over:
            self.sparkle_phase += dt
            return

        self.sparkle_phase += dt
        self._handle_held_keys(dt, keys)
        speed = max(0.09, 0.8 - (self.level - 1) * 0.06)
        if self.soft_drop:
            speed = max(0.03, speed * 0.16)
        self.drop_timer += dt
        if self.drop_timer >= speed:
            self.drop_timer = 0.0
            self.move_down()

    def _handle_held_keys(self, dt: float, keys: pygame.key.ScancodeWrapper) -> None:
        self._repeat_move("left", keys[pygame.K_LEFT], dt, self.move_left)
        self._repeat_move("right", keys[pygame.K_RIGHT], dt, self.move_right)
        self.soft_drop = bool(keys[pygame.K_DOWN])

    def _repeat_move(self, name: str, active: bool, dt: float, action) -> None:
        if not active:
            self.move_hold[name] = 0.0
            return
        self.move_hold[name] += dt
        hold = self.move_hold[name]
        if hold == dt or (hold > 0.18 and int((hold - 0.18) / 0.06) != int((hold - dt - 0.18) / 0.06)):
            action()

    def draw(self, screen: pygame.Surface) -> None:
        screen.fill(BACKGROUND)
        self._draw_background_stars(screen)
        self._draw_playfield(screen)
        self._draw_side_panel(screen)
        if self.game_over:
            self._draw_overlay(screen)

    def _draw_background_stars(self, screen: pygame.Surface) -> None:
        for index in range(18):
            base_x = 35 + (index * 47) % (WINDOW_WIDTH - 60)
            base_y = 32 + (index * 79) % (WINDOW_HEIGHT - 60)
            pulse = 3 + math.sin(self.sparkle_phase * 1.5 + index) * 1.5
            color = (255, 214, 236) if index % 2 else (215, 241, 255)
            pygame.draw.circle(screen, color, (int(base_x), int(base_y)), int(abs(pulse)))

    def _draw_playfield(self, screen: pygame.Surface) -> None:
        frame_rect = pygame.Rect(PLAY_X - 12, PLAY_Y - 12, PLAYFIELD_WIDTH * BLOCK_SIZE + 24, PLAYFIELD_HEIGHT * BLOCK_SIZE + 24)
        pygame.draw.rect(screen, SHADOW, frame_rect.move(6, 8), border_radius=24)
        pygame.draw.rect(screen, PANEL, frame_rect, border_radius=24)
        pygame.draw.rect(screen, FRAME, frame_rect, width=5, border_radius=24)

        board_rect = pygame.Rect(PLAY_X, PLAY_Y, PLAYFIELD_WIDTH * BLOCK_SIZE, PLAYFIELD_HEIGHT * BLOCK_SIZE)
        pygame.draw.rect(screen, (255, 251, 254), board_rect, border_radius=14)

        for row in range(PLAYFIELD_HEIGHT):
            for col in range(PLAYFIELD_WIDTH):
                cell_rect = pygame.Rect(PLAY_X + col * BLOCK_SIZE, PLAY_Y + row * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE)
                pygame.draw.rect(screen, GRID, cell_rect, width=1, border_radius=7)
                shape = self.board[row][col]
                if shape:
                    self._draw_block(screen, col, row, COLORS[shape])

        ghost = self.current_piece
        while self._valid(ghost.moved(0, 1)):
            ghost = ghost.moved(0, 1)
        for x, y in ghost.cells():
            if y >= 0:
                rect = pygame.Rect(PLAY_X + x * BLOCK_SIZE + 4, PLAY_Y + y * BLOCK_SIZE + 4, BLOCK_SIZE - 8, BLOCK_SIZE - 8)
                pygame.draw.rect(screen, (227, 211, 232), rect, width=2, border_radius=7)

        for x, y in self.current_piece.cells():
            if y >= 0:
                self._draw_block(screen, x, y, COLORS[self.current_piece.shape])

    def _draw_block(self, screen: pygame.Surface, x: int, y: int, color: tuple[int, int, int]) -> None:
        rect = pygame.Rect(PLAY_X + x * BLOCK_SIZE + 2, PLAY_Y + y * BLOCK_SIZE + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4)
        glow = tuple(min(255, channel + 30) for channel in color)
        pygame.draw.rect(screen, color, rect, border_radius=8)
        pygame.draw.rect(screen, glow, rect.inflate(-8, -8), border_radius=6)
        pygame.draw.rect(screen, (255, 255, 255), rect, width=2, border_radius=8)

    def _draw_side_panel(self, screen: pygame.Surface) -> None:
        title = self.font_title.render("Biancas Tetris", True, TEXT)
        screen.blit(title, (SIDE_X, 40))

        card = pygame.Rect(SIDE_X, 110, 290, 580)
        pygame.draw.rect(screen, SHADOW, card.move(5, 7), border_radius=28)
        pygame.draw.rect(screen, PANEL, card, border_radius=28)
        pygame.draw.rect(screen, ACCENT, card, width=4, border_radius=28)

        self._draw_label_value(screen, "Poeng", str(self.score), SIDE_X + 24, 140)
        self._draw_label_value(screen, "Linjer", str(self.lines), SIDE_X + 24, 210)
        self._draw_label_value(screen, "Level", str(self.level), SIDE_X + 24, 280)

        next_label = self.font_normal.render("Neste figur", True, TEXT)
        screen.blit(next_label, (SIDE_X + 24, 350))
        self._draw_next_piece(screen, SIDE_X + 40, 395)

        controls = [
            "Venstre/Hoyre: flytt",
            "Pil opp: roter",
            "Pil ned: raskere ned",
            "Mellomrom: slipp",
            "R: start pa nytt",
        ]
        y = 515
        control_title = self.font_normal.render("Kontroller", True, TEXT)
        screen.blit(control_title, (SIDE_X + 24, y))
        y += 38
        for line in controls:
            text = self.font_small.render(line, True, TEXT)
            screen.blit(text, (SIDE_X + 28, y))
            y += 28

        score_title = self.font_normal.render("Topp 5", True, TEXT)
        screen.blit(score_title, (SIDE_X + 165, 140))
        score_y = 180
        if not self.score_table:
            empty = self.font_small.render("Ingen score ennå", True, TEXT)
            screen.blit(empty, (SIDE_X + 165, score_y))
        else:
            for index, entry in enumerate(self.score_table, start=1):
                line = f"{index}. {entry['name']} - {entry['score']}"
                label = self.font_small.render(line, True, TEXT)
                screen.blit(label, (SIDE_X + 165, score_y))
                score_y += 28
                date_label = self.font_small.render(str(entry["date"]), True, TEXT)
                screen.blit(date_label, (SIDE_X + 185, score_y))
                score_y += 20

    def _draw_label_value(self, screen: pygame.Surface, label: str, value: str, x: int, y: int) -> None:
        label_surface = self.font_normal.render(label, True, TEXT)
        value_surface = self.font_big.render(value, True, FRAME)
        screen.blit(label_surface, (x, y))
        screen.blit(value_surface, (x, y + 32))

    def _draw_next_piece(self, screen: pygame.Surface, x: int, y: int) -> None:
        matrix = self.next_piece.matrix
        for row_index, row in enumerate(matrix):
            for col_index, value in enumerate(row):
                if value == "X":
                    rect = pygame.Rect(x + col_index * 28, y + row_index * 28, 24, 24)
                    color = COLORS[self.next_piece.shape]
                    glow = tuple(min(255, channel + 25) for channel in color)
                    pygame.draw.rect(screen, color, rect, border_radius=7)
                    pygame.draw.rect(screen, glow, rect.inflate(-6, -6), border_radius=5)
                    pygame.draw.rect(screen, (255, 255, 255), rect, width=2, border_radius=7)

    def _draw_overlay(self, screen: pygame.Surface) -> None:
        overlay = pygame.Surface((WINDOW_WIDTH, WINDOW_HEIGHT), pygame.SRCALPHA)
        overlay.fill((255, 240, 247, 180))
        screen.blit(overlay, (0, 0))

        message_box = pygame.Rect(150, 220, 620, 240)
        pygame.draw.rect(screen, SHADOW, message_box.move(6, 8), border_radius=26)
        pygame.draw.rect(screen, PANEL, message_box, border_radius=26)
        pygame.draw.rect(screen, FRAME, message_box, width=5, border_radius=26)

        title = self.font_big.render("Runde ferdig!", True, TEXT)
        sub = self.font_normal.render(f"Poeng: {self.score}", True, FRAME)
        if self.awaiting_name:
            help_text = self.font_small.render("Ny highscore! Skriv navn og trykk Enter.", True, TEXT)
            cheer = self.font_small.render("Backspace sletter. R starter ny runde senere.", True, TEXT)
        elif self.new_highscore:
            help_text = self.font_small.render("Highscore lagret! Trykk R for en ny runde.", True, TEXT)
            cheer = self.font_small.render("Bianca, du klarer neste rekord!", True, TEXT)
        else:
            help_text = self.font_small.render("Trykk R for en ny runde.", True, TEXT)
            cheer = self.font_small.render("Bianca, du klarer neste rekord!", True, TEXT)
        screen.blit(title, (message_box.x + 170, message_box.y + 45))
        screen.blit(sub, (message_box.x + 235, message_box.y + 108))
        screen.blit(help_text, (message_box.x + 125, message_box.y + 155))
        screen.blit(cheer, (message_box.x + 120, message_box.y + 185))
        if self.awaiting_name:
            input_box = pygame.Rect(message_box.x + 170, message_box.y + 110, 280, 36)
            pygame.draw.rect(screen, (255, 255, 255), input_box, border_radius=10)
            pygame.draw.rect(screen, ACCENT, input_box, width=3, border_radius=10)
            shown_name = self.name_input if self.name_input else "Skriv navn her"
            color = TEXT if self.name_input else (170, 155, 175)
            name_surface = self.font_small.render(shown_name, True, color)
            screen.blit(name_surface, (input_box.x + 10, input_box.y + 8))


def run(test_mode: bool = False) -> None:
    pygame.init()
    screen = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
    pygame.display.set_caption("Biancas Tetris")
    clock = pygame.time.Clock()
    game = TetrisGame()

    frames = 0
    running = True
    while running:
        dt = clock.tick(60) / 1000.0
        keys = pygame.key.get_pressed()
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False
                elif event.key == pygame.K_r and not game.awaiting_name:
                    game.reset()
                elif game.awaiting_name:
                    game.handle_name_input(event)
                elif not game.game_over:
                    if event.key == pygame.K_UP:
                        game.rotate()
                    elif event.key == pygame.K_SPACE:
                        game.hard_drop()

        game.update(dt, keys)
        game.draw(screen)
        pygame.display.flip()

        frames += 1
        if test_mode and frames > 5:
            running = False

    pygame.quit()


def main() -> None:
    parser = argparse.ArgumentParser(description="Lekent Tetris-spill for Bianca.")
    parser.add_argument("--test-mode", action="store_true", help="Starter spillet i en kort testmodus.")
    args = parser.parse_args()
    run(test_mode=args.test_mode)


if __name__ == "__main__":
    main()
