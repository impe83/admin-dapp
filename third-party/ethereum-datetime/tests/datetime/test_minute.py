
import pytest

@pytest.mark.parametrize(
    'timestamp,minute',
    (
        (63071999, 59),
        (63072000, 0),
        (63072059, 0),
        (63072060, 1),
        (63072119, 1),
        (63072120, 2),
        (63072179, 2),
        (63072180, 3),
        (63072239, 3),
        (63072240, 4),
        (63072299, 4),
        (63072300, 5),
        (63072359, 5),
        (63072360, 6),
        (63072419, 6),
        (63072420, 7),
        (63072479, 7),
        (63072480, 8),
        (63072539, 8),
        (63072540, 9),
        (63072599, 9),
        (63072600, 10),
        (63072659, 10),
        (63072660, 11),
        (63072719, 11),
        (63072720, 12),
        (63072779, 12),
        (63072780, 13),
        (63072839, 13),
        (63072840, 14),
        (63072899, 14),
        (63072900, 15),
        (63072959, 15),
        (63072960, 16),
        (63073019, 16),
        (63073020, 17),
        (63073079, 17),
        (63073080, 18),
        (63073139, 18),
        (63073140, 19),
        (63073199, 19),
        (63073200, 20),
        (63073259, 20),
        (63073260, 21),
        (63073319, 21),
        (63073320, 22),
        (63073379, 22),
        (63073380, 23),
        (63073439, 23),
        (63073440, 24),
        (63073499, 24),
        (63073500, 25),
        (63073559, 25),
        (63073560, 26),
        (63073619, 26),
        (63073620, 27),
        (63073679, 27),
        (63073680, 28),
        (63073739, 28),
        (63073740, 29),
        (63073799, 29),
        (63073800, 30),
        (63073859, 30),
        (63073860, 31),
        (63073919, 31),
        (63073920, 32),
        (63073979, 32),
        (63073980, 33),
        (63074039, 33),
        (63074040, 34),
        (63074099, 34),
        (63074100, 35),
        (63074159, 35),
        (63074160, 36),
        (63074219, 36),
        (63074220, 37),
        (63074279, 37),
        (63074280, 38),
        (63074339, 38),
        (63074340, 39),
        (63074399, 39),
        (63074400, 40),
        (63074459, 40),
        (63074460, 41),
        (63074519, 41),
        (63074520, 42),
        (63074579, 42),
        (63074580, 43),
        (63074639, 43),
        (63074640, 44),
        (63074699, 44),
        (63074700, 45),
        (63074759, 45),
        (63074760, 46),
        (63074819, 46),
        (63074820, 47),
        (63074879, 47),
        (63074880, 48),
        (63074939, 48),
        (63074940, 49),
        (63074999, 49),
        (63075000, 50),
        (63075059, 50),
        (63075060, 51),
        (63075119, 51),
        (63075120, 52),
        (63075179, 52),
        (63075180, 53),
        (63075239, 53),
        (63075240, 54),
        (63075299, 54),
        (63075300, 55),
        (63075359, 55),
        (63075360, 56),
        (63075419, 56),
        (63075420, 57),
        (63075479, 57),
        (63075480, 58),
        (63075539, 58),
        (63075540, 59),
        (63075599, 59),
        (63075600, 0),
    ),
)
def test_get_minute_from_timestamp(deployed_contracts, timestamp, minute):
    crontab = deployed_contracts.DateTime
    assert crontab.getMinute(timestamp) == minute
