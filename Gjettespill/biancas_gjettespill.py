from __future__ import annotations

import argparse
import json
import random
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

import pygame


WINDOW_WIDTH = 1180
WINDOW_HEIGHT = 760
TITLE = "Biancas Gjettespill"

BASE_DIR = Path(__file__).resolve().parent
ASSETS_DIR = BASE_DIR / "assets"
SOUNDS_DIR = ASSETS_DIR / "sounds"
ICON_PATH = ASSETS_DIR / "gjettespill_icon.ico"

BACKGROUND = (247, 236, 255)
PANEL = (255, 255, 255)
TEXT = (80, 57, 108)
SUBTEXT = (118, 98, 145)
PURPLE = (173, 112, 255)
PINK = (255, 115, 196)
BLUE = (89, 198, 255)
GREEN = (121, 214, 118)
GOLD = (255, 205, 81)
RED = (255, 112, 120)
SHADOW = (212, 178, 235)
INPUT_BG = (252, 248, 255)
HIGHLIGHT = (255, 255, 255)

FPS = 60
MAX_CONFETTI = 120


def clamp(value: int, minimum: int, maximum: int) -> int:
    return max(minimum, min(maximum, value))


@dataclass
class Player:
    name: str
    total_attempts: int = 0
    round_attempts: int = 0
    wins: int = 0


class InputField:
    def __init__(self, name: str, label: str, value: str, rect: pygame.Rect, numeric: bool = False) -> None:
        self.name = name
        self.label = label
        self.value = value
        self.rect = rect
        self.numeric = numeric
        self.active = False

    def handle_event(self, event: pygame.event.Event) -> bool:
        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            self.active = self.rect.collidepoint(event.pos)
            return self.active

        if not self.active or event.type != pygame.KEYDOWN:
            return False

        if event.key == pygame.K_BACKSPACE:
            self.value = self.value[:-1]
            return True

        if event.key in (pygame.K_TAB, pygame.K_RETURN, pygame.K_KP_ENTER):
            return False

        if len(self.value) >= 14:
            return False

        character = event.unicode
        if not character or not character.isprintable():
            return False

        if self.numeric and not character.isdigit():
            return False

        self.value += character
        return True


class DropdownField:
    def __init__(self, name: str, label: str, options: List[str], selected_index: int, rect: pygame.Rect) -> None:
        self.name = name
        self.label = label
        self.options = options
        self.selected_index = selected_index
        self.rect = rect
        self.active = False
        self.expanded = False

    @property
    def value(self) -> str:
        return self.options[self.selected_index]

    def option_rect(self, index: int) -> pygame.Rect:
        return pygame.Rect(
            self.rect.x,
            self.rect.y + self.rect.height + index * self.rect.height,
            self.rect.width,
            self.rect.height,
        )

    def handle_event(self, event: pygame.event.Event) -> bool:
        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            if self.rect.collidepoint(event.pos):
                self.active = True
                self.expanded = not self.expanded
                return True

            if self.expanded:
                for index in range(len(self.options)):
                    if self.option_rect(index).collidepoint(event.pos):
                        self.selected_index = index
                        self.expanded = False
                        self.active = False
                        return True

            self.active = False
            self.expanded = False
            return False

        if not self.active or event.type != pygame.KEYDOWN:
            return False

        if event.key in (pygame.K_RETURN, pygame.K_KP_ENTER, pygame.K_SPACE):
            self.expanded = not self.expanded
            return True

        if event.key == pygame.K_ESCAPE:
            self.expanded = False
            self.active = False
            return True

        if event.key in (pygame.K_UP, pygame.K_LEFT):
            self.selected_index = (self.selected_index - 1) % len(self.options)
            return True

        if event.key in (pygame.K_DOWN, pygame.K_RIGHT):
            self.selected_index = (self.selected_index + 1) % len(self.options)
            return True

        return False


class GuessGame:
    def __init__(self) -> None:
        self.highscore_dir = Path.home() / "Biancas_Gjettespill"
        self.highscore_dir.mkdir(parents=True, exist_ok=True)
        self.highscore_path = self.highscore_dir / "highscore.json"
        self.highscores = self._load_highscores()

        self.confetti_particles: List[Dict[str, Union[float, int, Tuple[int, int, int]]]] = []
        self.confetti_active = False

        pygame.init()
        self.audio_enabled = self._init_mixer()

        pygame.display.set_caption(TITLE)
        self.screen = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))

        if ICON_PATH.exists():
            try:
                pygame.display.set_icon(pygame.image.load(str(ICON_PATH)))
            except pygame.error:
                pass

        self.clock = pygame.time.Clock()
        self.font_small = pygame.font.SysFont("arial", 22)
        self.font_medium = pygame.font.SysFont("arial", 28, bold=True)
        self.font_big = pygame.font.SysFont("arial", 42, bold=True)
        self.font_title = pygame.font.SysFont("comicsansms", 48, bold=True)

        self.random = random.Random()
        self.player_count_dropdown = DropdownField(
            "player_count",
            "Antall spillere",
            ["1", "2", "3", "4"],
            1,
            pygame.Rect(100, 200, 260, 54),
        )
        self.setup_fields = self._build_setup_fields()
        self.setup_message = "Velg spillere, maks-tall og antall runder."
        self.mode = "setup"

        self.players: List[Player] = []
        self.player_index = 0
        self.current_round = 1
        self.total_rounds = 3
        self.max_number = 457
        self.secret_number = 0
        self.guess_value = ""
        self.feedback = ""
        self.round_message = ""
        self.round_winner: Optional[str] = None
        self.final_winner: Optional[Player] = None

        self.start_button = pygame.Rect(110, 620, 240, 64)
        self.next_button = pygame.Rect(110, 620, 240, 64)
        self.restart_button = pygame.Rect(380, 620, 260, 64)

        self.sound_correct = self._load_sound("correct.wav")
        self.sound_wrong = self._load_sound("wrong.wav")
        self.sound_win = self._load_sound("win.wav")

    def _init_mixer(self) -> bool:
        try:
            pygame.mixer.init()
            return True
        except pygame.error:
            return False

    def _load_sound(self, filename: str) -> Optional[pygame.mixer.Sound]:
        if not self.audio_enabled:
            return None

        path = SOUNDS_DIR / filename
        if not path.exists():
            return None

        try:
            return pygame.mixer.Sound(str(path))
        except pygame.error:
            return None

    def _play_sound(self, sound: Optional[pygame.mixer.Sound]) -> None:
        if sound is None:
            return
        try:
            sound.play()
        except pygame.error:
            pass

    def _load_highscores(self) -> List[Dict[str, Union[int, str]]]:
        if not self.highscore_path.exists():
            return []

        try:
            data = json.loads(self.highscore_path.read_text(encoding="utf-8"))
            if isinstance(data, list):
                cleaned: List[Dict[str, Union[int, str]]] = []
                for entry in data:
                    if isinstance(entry, dict):
                        cleaned.append(
                            {
                                "name": str(entry.get("name", "Ukjent")),
                                "attempts": int(entry.get("attempts", 0)),
                                "wins": int(entry.get("wins", 0)),
                            }
                        )
                return cleaned
        except (OSError, json.JSONDecodeError, ValueError, TypeError):
            pass
        return []

    def _save_highscores(self) -> None:
        try:
            self.highscore_path.write_text(
                json.dumps(self.highscores, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
        except OSError:
            pass

    def _add_highscore(self, winner: Player) -> None:
        self.highscores.append(
            {
                "name": winner.name,
                "attempts": winner.total_attempts,
                "wins": winner.wins,
            }
        )
        self.highscores = sorted(
            self.highscores,
            key=lambda e: (-int(e["wins"]), int(e["attempts"]), str(e["name"]).lower()),
        )[:10]
        self._save_highscores()

    def _build_setup_fields(self) -> List[InputField]:
        return [
            InputField("max_number", "Høyeste tall", "457", pygame.Rect(100, 340, 260, 48), numeric=True),
            InputField("rounds", "Antall runder", "3", pygame.Rect(100, 460, 260, 48), numeric=True),
            InputField("player1", "", "Bianca", pygame.Rect(470, 185, 260, 48)),
            InputField("player2", "", "Spiller 2", pygame.Rect(470, 255, 260, 48)),
            InputField("player3", "", "Spiller 3", pygame.Rect(470, 325, 260, 48)),
            InputField("player4", "", "Spiller 4", pygame.Rect(470, 395, 260, 48)),
        ]

    def _enabled_player_count(self) -> int:
        try:
            return clamp(int(self.player_count_dropdown.value), 1, 4)
        except ValueError:
            return 1

    def _field_is_enabled(self, field: InputField) -> bool:
        if field.name.startswith("player") and field.name[6:].isdigit():
            return int(field.name[6:]) <= self._enabled_player_count()
        return True

    def _active_setup_controls(self) -> List[Union[DropdownField, InputField]]:
        controls: List[Union[DropdownField, InputField]] = [self.player_count_dropdown]
        for field in self.setup_fields:
            if self._field_is_enabled(field):
                controls.append(field)
        return controls

    def run(self, test_mode: bool = False) -> None:
        frames = 0
        running = True

        while running:
            self.clock.tick(FPS)

            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False
                elif event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                    running = False
                else:
                    self.handle_event(event)

            self.draw()
            pygame.display.flip()

            frames += 1
            if test_mode and frames > 5:
                running = False

        pygame.quit()
        sys.exit(0)

    def handle_event(self, event: pygame.event.Event) -> None:
        if self.mode == "setup":
            self._handle_setup_event(event)
        elif self.mode == "playing":
            self._handle_game_event(event)
        elif self.mode == "round_end":
            self._handle_round_end_event(event)
        elif self.mode == "game_over":
            self._handle_game_over_event(event)

    def _handle_setup_event(self, event: pygame.event.Event) -> None:
        previous_count = self._enabled_player_count()

        dropdown_handled = self.player_count_dropdown.handle_event(event)
        new_count = self._enabled_player_count()
        if new_count != previous_count:
            self._sync_player_defaults()

        if dropdown_handled and event.type == pygame.MOUSEBUTTONDOWN:
            return

        for field in self.setup_fields:
            enabled = self._field_is_enabled(field)
            if not enabled:
                field.active = False
                continue
            field.handle_event(event)

        if event.type == pygame.KEYDOWN and event.key == pygame.K_TAB:
            controls = self._active_setup_controls()
            active_index = next((index for index, control in enumerate(controls) if control.active), -1)

            if active_index >= 0:
                controls[active_index].active = False
                if isinstance(controls[active_index], DropdownField):
                    controls[active_index].expanded = False

            next_index = (active_index + 1) % len(controls)
            controls[next_index].active = True
            if isinstance(controls[next_index], DropdownField):
                controls[next_index].expanded = False

        if event.type == pygame.KEYDOWN and event.key in (pygame.K_RETURN, pygame.K_KP_ENTER):
            if not self.player_count_dropdown.expanded:
                self._start_game()
        elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1 and self.start_button.collidepoint(event.pos):
            self._start_game()

    def _sync_player_defaults(self) -> None:
        for i in range(2, 5):
            field = self._field(f"player{i}")
            default_name = f"Spiller {i}"
            if field.value.strip() == "" or field.value.strip() == "Ikke i bruk":
                field.value = default_name

    def _start_game(self) -> None:
        values = {field.name: field.value.strip() for field in self.setup_fields}

        try:
            player_count = self._enabled_player_count()
            max_number = clamp(int(values["max_number"] or "100"), 5, 999999)
            rounds = clamp(int(values["rounds"] or "3"), 1, 20)
        except ValueError:
            self.setup_message = "Tallfeltene må inneholde gyldige tall."
            return

        names: List[str] = []
        for index in range(player_count):
            raw = values[f"player{index + 1}"]
            name = raw if raw else ("Bianca" if index == 0 else f"Spiller {index + 1}")
            names.append(name)

        self.players = [Player(name=name[:14]) for name in names]
        self.player_index = 0
        self.current_round = 1
        self.total_rounds = rounds
        self.max_number = max_number
        self.guess_value = ""
        self.feedback = ""
        self.round_message = ""
        self.round_winner = None
        self.final_winner = None
        self.confetti_active = False
        self.confetti_particles.clear()
        self.setup_message = "Velg spillere, maks-tall og antall runder."
        self._start_round()

    def _start_round(self) -> None:
        for player in self.players:
            player.round_attempts = 0

        self.secret_number = self.random.randint(0, self.max_number)
        self.player_index = 0
        self.guess_value = ""
        self.feedback = f"Runde {self.current_round}: Gjett et tall mellom 0 og {self.max_number}."
        self.round_message = ""
        self.round_winner = None
        self.mode = "playing"

    def _handle_game_event(self, event: pygame.event.Event) -> None:
        if event.type != pygame.KEYDOWN:
            return

        if event.key == pygame.K_BACKSPACE:
            self.guess_value = self.guess_value[:-1]
            return

        if event.key in (pygame.K_RETURN, pygame.K_KP_ENTER):
            self._submit_guess()
            return

        if len(self.guess_value) >= 10:
            return

        if event.unicode and event.unicode.isdigit():
            self.guess_value += event.unicode

    def _submit_guess(self) -> None:
        if not self.guess_value:
            self.feedback = "Skriv inn et tall først."
            return

        guess = int(self.guess_value)
        self.guess_value = ""

        if guess < 0 or guess > self.max_number:
            self.feedback = f"Tallet må være mellom 0 og {self.max_number}."
            return

        player = self.players[self.player_index]
        player.total_attempts += 1
        player.round_attempts += 1

        if guess < self.secret_number:
            self.feedback = f"{player.name} gjettet {guess}. For lavt!"
            self._play_sound(self.sound_wrong)
            self._advance_turn()
            return

        if guess > self.secret_number:
            self.feedback = f"{player.name} gjettet {guess}. For høyt!"
            self._play_sound(self.sound_wrong)
            self._advance_turn()
            return

        player.wins += 1
        self.round_winner = player.name
        self.round_message = (
            f"Gratulerer {player.name}! Du brukte {player.round_attempts} "
            f"forsøk for å finne riktig svar {self.secret_number}."
        )
        self._play_sound(self.sound_correct)
        self._start_confetti()
        self.mode = "round_end"

    def _advance_turn(self) -> None:
        self.player_index = (self.player_index + 1) % len(self.players)

    def _handle_round_end_event(self, event: pygame.event.Event) -> None:
        if event.type == pygame.KEYDOWN and event.key in (pygame.K_RETURN, pygame.K_KP_ENTER, pygame.K_SPACE):
            self._advance_after_round()
        elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1 and self.next_button.collidepoint(event.pos):
            self._advance_after_round()

    def _advance_after_round(self) -> None:
        if self.current_round >= self.total_rounds:
            self.final_winner = max(self.players, key=lambda p: (p.wins, -p.total_attempts))
            self._add_highscore(self.final_winner)
            self._play_sound(self.sound_win)
            self.mode = "game_over"
            self.feedback = "Spillet er ferdig."
            return

        self.current_round += 1
        self._start_round()

    def _handle_game_over_event(self, event: pygame.event.Event) -> None:
        if event.type == pygame.KEYDOWN and event.key == pygame.K_r:
            self._return_to_setup()
        elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1 and self.restart_button.collidepoint(event.pos):
            self._return_to_setup()

    def _return_to_setup(self) -> None:
        self.mode = "setup"
        self.guess_value = ""
        self.confetti_active = False
        self.confetti_particles.clear()

    def _start_confetti(self) -> None:
        self.confetti_particles = []
        self.confetti_active = True

        for _ in range(MAX_CONFETTI):
            x = random.randint(0, WINDOW_WIDTH)
            y = random.randint(-100, 0)
            color = random.choice([PURPLE, PINK, BLUE, GREEN, GOLD, RED])
            speed = random.uniform(2.0, 6.0)
            size = random.randint(6, 16)
            alpha = 255
            self.confetti_particles.append(
                {"x": x, "y": y, "color": color, "speed": speed, "size": size, "alpha": alpha}
            )

    def _update_confetti(self) -> None:
        if not self.confetti_active:
            return

        for particle in self.confetti_particles:
            particle["y"] = float(particle["y"]) + float(particle["speed"])
            particle["alpha"] = max(0, int(particle["alpha"]) - 8)

        self.confetti_particles = [
            particle
            for particle in self.confetti_particles
            if float(particle["y"]) < WINDOW_HEIGHT and int(particle["alpha"]) > 0
        ]

        if not self.confetti_particles:
            self.confetti_active = False

    def _draw_confetti(self) -> None:
        for particle in self.confetti_particles:
            size = int(particle["size"])
            surf = pygame.Surface((size * 2, size * 2), pygame.SRCALPHA)
            base_color = particle["color"]
            if isinstance(base_color, tuple):
                color = (*base_color, int(particle["alpha"]))
            else:
                color = (*PURPLE, int(particle["alpha"]))
            pygame.draw.circle(surf, color, (size, size), size)
            self.screen.blit(surf, (int(particle["x"]) - size, int(particle["y"]) - size))

    def draw(self) -> None:
        self.screen.fill(BACKGROUND)
        self._draw_background()

        if self.mode == "setup":
            self._draw_setup()
        elif self.mode == "playing":
            self._draw_game()
        elif self.mode == "round_end":
            self._draw_game()
            self._draw_round_overlay()
        elif self.mode == "game_over":
            self._draw_game_over()

        self._update_confetti()
        self._draw_confetti()

    def _draw_background(self) -> None:
        for index in range(14):
            x = 70 + (index * 83) % (WINDOW_WIDTH - 100)
            y = 50 + (index * 97) % (WINDOW_HEIGHT - 100)
            radius = 22 + (index % 4) * 7
            color = (255, 224, 245) if index % 2 == 0 else (224, 243, 255)
            pygame.draw.circle(self.screen, color, (x, y), radius)

    def _draw_setup(self) -> None:
        self._draw_title("Biancas Gjettespill", "Velkommen til et fargerikt tallmysterium!")
        self._draw_card(pygame.Rect(60, 120, 1060, 580))

        left_title = self.font_medium.render("Spillvalg", True, TEXT)
        self.screen.blit(left_title, (100, 130))

        for field in self.setup_fields:
            self._draw_field(field, enabled=self._field_is_enabled(field))

        self._draw_dropdown(self.player_count_dropdown)

        hint = self.font_small.render(self.setup_message, True, SUBTEXT)
        self.screen.blit(hint, (100, 535))

        self._draw_button(self.start_button, "Start spillet", PINK)

        info_lines = [
            "Slik virker det:",
            "Velg 1-4 spillere og skriv navnene deres.",
            "Velg høyeste tall og antall runder.",
            "Spillerne gjetter på samme hemmelige tall i tur og orden.",
            "Når noen treffer riktig, starter neste runde.",
        ]
        y = 150
        info_x = 785
        wrap_width = 28

        for index, line in enumerate(info_lines):
            font = self.font_medium if index == 0 else self.font_small
            color = TEXT if index == 0 else SUBTEXT
            if index == 0:
                self.screen.blit(font.render(line, True, color), (info_x, y))
                y += 42
            else:
                for wrapped_line in self._wrap_text(line, wrap_width):
                    self.screen.blit(font.render(wrapped_line, True, color), (info_x, y))
                    y += 34

    def _draw_dropdown(self, dropdown: DropdownField) -> None:
        label = self.font_small.render(dropdown.label, True, TEXT)
        self.screen.blit(label, (dropdown.rect.x, dropdown.rect.y - 34))

        border = PINK if dropdown.active else PURPLE
        pygame.draw.rect(self.screen, (255, 255, 255), dropdown.rect, border_radius=15)
        pygame.draw.rect(self.screen, INPUT_BG, dropdown.rect.inflate(-8, -8), border_radius=11)
        pygame.draw.rect(self.screen, border, dropdown.rect, width=3, border_radius=15)

        value_label = self.font_small.render(dropdown.value, True, TEXT)
        self.screen.blit(value_label, (dropdown.rect.x + 14, dropdown.rect.y + 12))

        arrow = "^" if dropdown.expanded else "v"
        arrow_label = self.font_small.render(arrow, True, SUBTEXT)
        self.screen.blit(arrow_label, (dropdown.rect.right - 24, dropdown.rect.y + 12))

        if dropdown.expanded:
            list_rect = pygame.Rect(
                dropdown.rect.x,
                dropdown.rect.y + dropdown.rect.height,
                dropdown.rect.width,
                dropdown.rect.height * len(dropdown.options),
            )
            pygame.draw.rect(self.screen, (255, 255, 255), list_rect, border_radius=14)
            for index, option in enumerate(dropdown.options):
                option_rect = dropdown.option_rect(index)
                fill = (246, 239, 255) if index == dropdown.selected_index else (255, 255, 255)
                pygame.draw.rect(self.screen, fill, option_rect.inflate(-6, -6), border_radius=9)
                pygame.draw.rect(self.screen, PURPLE, option_rect, width=2, border_radius=12)
                option_label = self.font_small.render(option, True, TEXT)
                self.screen.blit(option_label, (option_rect.x + 14, option_rect.y + 12))

    def _draw_game(self) -> None:
        self._draw_title(
            f"Runde {self.current_round} av {self.total_rounds}",
            f"Tur: {self.players[self.player_index].name} | Gjett mellom 0 og {self.max_number}",
        )
        self._draw_card(pygame.Rect(60, 120, 640, 580))
        self._draw_card(pygame.Rect(730, 120, 390, 580))

        guess_label = self.font_medium.render("Skriv gjetningen din", True, TEXT)
        self.screen.blit(guess_label, (100, 180))

        guess_box = pygame.Rect(100, 230, 280, 64)
        pygame.draw.rect(self.screen, INPUT_BG, guess_box, border_radius=18)
        pygame.draw.rect(self.screen, PURPLE, guess_box, width=4, border_radius=18)
        guess_text = self.guess_value or "Skriv tall her"
        guess_color = TEXT if self.guess_value else SUBTEXT
        self.screen.blit(self.font_big.render(guess_text, True, guess_color), (118, 241))

        submit_hint = self.font_small.render("Trykk Enter for å gjette.", True, SUBTEXT)
        self.screen.blit(submit_hint, (100, 315))

        current_player = self.players[self.player_index]
        player_badge = pygame.Rect(100, 360, 280, 70)
        pygame.draw.rect(self.screen, (255, 244, 252), player_badge, border_radius=20)
        pygame.draw.rect(self.screen, BLUE, player_badge, width=3, border_radius=20)
        self.screen.blit(self.font_small.render("Aktiv spiller", True, SUBTEXT), (120, 375))
        self.screen.blit(self.font_medium.render(current_player.name, True, TEXT), (120, 397))

        feedback_rect = pygame.Rect(100, 470, 540, 110)
        pygame.draw.rect(self.screen, (252, 246, 255), feedback_rect, border_radius=20)
        pygame.draw.rect(self.screen, GOLD, feedback_rect, width=3, border_radius=20)
        self.screen.blit(self.font_medium.render("Tilbakemelding", True, TEXT), (120, 490))
        for index, line in enumerate(self._wrap_text(self.feedback, 42)):
            self.screen.blit(self.font_small.render(line, True, TEXT), (120, 530 + index * 28))

        self._draw_score_table(750, 160)

    def _draw_round_overlay(self) -> None:
        overlay = pygame.Surface((WINDOW_WIDTH, WINDOW_HEIGHT), pygame.SRCALPHA)
        overlay.fill((255, 239, 250, 180))
        self.screen.blit(overlay, (0, 0))

        box = pygame.Rect(210, 220, 760, 250)
        pygame.draw.rect(self.screen, SHADOW, box.move(6, 8), border_radius=28)
        pygame.draw.rect(self.screen, PANEL, box, border_radius=28)
        pygame.draw.rect(self.screen, GREEN, box, width=4, border_radius=28)

        self.screen.blit(self.font_big.render("Riktig!", True, TEXT), (500, 255))
        for index, line in enumerate(self._wrap_text(self.round_message, 58)):
            self.screen.blit(self.font_small.render(line, True, TEXT), (260, 315 + index * 30))
        self._draw_button(self.next_button, "Neste runde", GREEN)

    def _draw_game_over(self) -> None:
        self._draw_title("Spillet er ferdig!", "Her er resultatene etter alle rundene.")
        self._draw_card(pygame.Rect(60, 120, 1060, 580))

        winner = self.final_winner or max(self.players, key=lambda player: (player.wins, -player.total_attempts))
        headline = f"Vinner: {winner.name} med {winner.wins} riktige runder og {winner.total_attempts} forsøk totalt!"
        for index, line in enumerate(self._wrap_text(headline, 75)):
            self.screen.blit(self.font_medium.render(line, True, TEXT), (100, 170 + index * 36))

        self._draw_score_table(100, 270, wide=True)
        self._draw_button(self.restart_button, "Tilbake til start", PINK)
        hint = self.font_small.render("Trykk R for å starte et nytt spill.", True, SUBTEXT)
        self.screen.blit(hint, (400, 700))

        y = 550
        self.screen.blit(self.font_medium.render("Highscore:", True, GOLD), (750, y))
        for idx, entry in enumerate(self.highscores[:5]):
            hs = f"{entry['name']}: {entry['wins']} riktige, {entry['attempts']} forsøk"
            self.screen.blit(self.font_small.render(hs, True, TEXT), (750, y + 36 + idx * 28))

    def _draw_score_table(self, x: int, y: int, wide: bool = False) -> None:
        width = 340 if not wide else 890
        height = 360 if not wide else 260
        rect = pygame.Rect(x, y, width, height)
        pygame.draw.rect(self.screen, (252, 248, 255), rect, border_radius=24)
        pygame.draw.rect(self.screen, PURPLE, rect, width=4, border_radius=24)

        title = self.font_medium.render("Resultattabell", True, TEXT)
        self.screen.blit(title, (x + 20, y + 18))

        if wide:
            headers = [("Spiller", 20), ("Denne runden", 250), ("Totalt forsøk", 470), ("Riktige runder", 700)]
        else:
            headers = [("Spiller", 20), ("Denne runden", 165), ("Totalt", 285)]

        for label, offset in headers:
            self.screen.blit(self.font_small.render(label, True, SUBTEXT), (x + offset, y + 62))

        line_y = y + 100
        for player in self.players:
            row = pygame.Rect(x + 15, line_y - 6, width - 30, 44)
            pygame.draw.rect(self.screen, HIGHLIGHT, row, border_radius=16)
            self.screen.blit(self.font_small.render(player.name, True, TEXT), (x + 20, line_y))

            if wide:
                self.screen.blit(self.font_small.render(str(player.round_attempts), True, TEXT), (x + 300, line_y))
                self.screen.blit(self.font_small.render(str(player.total_attempts), True, TEXT), (x + 520, line_y))
                self.screen.blit(self.font_small.render(str(player.wins), True, TEXT), (x + 760, line_y))
            else:
                self.screen.blit(self.font_small.render(str(player.round_attempts), True, TEXT), (x + 195, line_y))
                self.screen.blit(self.font_small.render(str(player.total_attempts), True, TEXT), (x + 305, line_y))

            line_y += 54

    def _draw_title(self, title: str, subtitle: str) -> None:
        self.screen.blit(self.font_title.render(title, True, TEXT), (60, 36))
        self.screen.blit(self.font_small.render(subtitle, True, SUBTEXT), (64, 88))

    def _draw_card(self, rect: pygame.Rect) -> None:
        pygame.draw.rect(self.screen, SHADOW, rect.move(6, 8), border_radius=28)
        pygame.draw.rect(self.screen, PANEL, rect, border_radius=28)
        pygame.draw.rect(self.screen, PURPLE, rect, width=4, border_radius=28)

    def _draw_field(self, field: InputField, enabled: bool = True) -> None:
        if not enabled:
            return

        if field.label:
            label = self.font_small.render(field.label, True, TEXT)
            self.screen.blit(label, (field.rect.x, field.rect.y - 38))

        fill = INPUT_BG
        border = PINK if field.active else PURPLE
        pygame.draw.rect(self.screen, fill, field.rect, border_radius=15)
        pygame.draw.rect(self.screen, border, field.rect, width=3, border_radius=15)

        text = field.value if field.value else "Skriv her"
        color = TEXT
        self.screen.blit(self.font_small.render(text, True, color), (field.rect.x + 14, field.rect.y + 12))

    def _draw_button(self, rect: pygame.Rect, text: str, color: Tuple[int, int, int]) -> None:
        pygame.draw.rect(self.screen, SHADOW, rect.move(4, 6), border_radius=22)
        pygame.draw.rect(self.screen, color, rect, border_radius=22)
        pygame.draw.rect(self.screen, (255, 255, 255), rect, width=3, border_radius=22)
        label = self.font_medium.render(text, True, (255, 255, 255))
        label_rect = label.get_rect(center=rect.center)
        self.screen.blit(label, label_rect)

    def _field(self, name: str) -> InputField:
        for field in self.setup_fields:
            if field.name == name:
                return field
        raise KeyError(name)

    def _wrap_text(self, text: str, max_chars: int) -> List[str]:
        words = text.split()
        if not words:
            return [""]

        lines: List[str] = []
        current = words[0]

        for word in words[1:]:
            candidate = current + " " + word
            if len(candidate) <= max_chars:
                current = candidate
            else:
                lines.append(current)
                current = word

        lines.append(current)
        return lines


def main() -> None:
    parser = argparse.ArgumentParser(description="Biancas Gjettespill")
    parser.add_argument("--test-mode", action="store_true", help="Starter spillet i en kort testmodus.")
    args = parser.parse_args()
    GuessGame().run(test_mode=args.test_mode)


if __name__ == "__main__":
    main()