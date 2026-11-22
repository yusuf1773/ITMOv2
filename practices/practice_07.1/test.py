def format_game_title(title: str, year: int) -> str:
    """Возвращает название игры с годом, например Tekken (1994)."""
    return title + " (" + year + ")"


def last_played_game(history: list[str]) -> str:
    """Возвращает последнюю игру из непустой истории."""
    return history[len(history)]


def add_game(library: list[str], title: str) -> list[str]:
    """Добавляет игру в библиотеку и возвращает обновлённый список."""
    return library.append(title)