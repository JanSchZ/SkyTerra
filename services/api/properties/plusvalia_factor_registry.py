from typing import Callable, Dict

"""Registro global de factores para el cálculo de plusvalía.
Cada factor debe ser una función callable(property) -> int/float (0-100).
Los pesos se almacenan en un diccionario paralelo.
Esto permite incorporar fácilmente docenas o cientos de factores externos sin tocar
el core de PlusvaliaService: basta con registrar nuevas funciones usando el decorador
`@register_factor`.
"""

_factor_funcs: Dict[str, Callable] = {}
_factor_weights: Dict[str, float] = {}

def register_factor(name: str, weight: float):
    """Decorador para registrar un nuevo factor.
    Args:
        name (str): ID único del factor.
        weight (float): peso relativo (0-1). Se normalizará en runtime si la suma !=1.
    """
    def decorator(func: Callable):
        _factor_funcs[name] = func
        _factor_weights[name] = weight
        return func
    return decorator

def get_factors():
    return _factor_funcs

def get_weights():
    return _factor_weights 