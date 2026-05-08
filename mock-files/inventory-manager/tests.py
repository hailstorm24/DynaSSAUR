import pytest
# from solution import add_item, remove_item, get_total_value, find_item

# --- add_item ---

def test_add_item_basic():
    inv = {}
    add_item(inv, "apple", 10, 0.99)
    assert inv == {"apple": {"quantity": 10, "price": 0.99}}

def test_add_item_case_insensitive():
    inv = {}
    add_item(inv, "Apple", 10, 0.99)
    assert "apple" in inv
    assert "Apple" not in inv

def test_add_item_duplicate_increases_quantity():
    inv = {}
    add_item(inv, "apple", 10, 0.99)
    add_item(inv, "apple", 5, 0.99)
    assert inv["apple"]["quantity"] == 15

def test_add_item_duplicate_updates_price():
    inv = {}
    add_item(inv, "apple", 10, 0.99)
    add_item(inv, "apple", 0, 1.49)
    assert inv["apple"]["price"] == 1.49

def test_add_item_returns_inventory():
    inv = {}
    result = add_item(inv, "apple", 10, 0.99)
    assert result is inv


# --- remove_item ---

def test_remove_item_basic():
    inv = {"apple": {"quantity": 10, "price": 0.99}}
    remove_item(inv, "apple")
    assert "apple" not in inv

def test_remove_item_not_found_raises():
    inv = {}
    with pytest.raises(KeyError):
        remove_item(inv, "apple")

def test_remove_item_returns_inventory():
    inv = {"apple": {"quantity": 10, "price": 0.99}}
    result = remove_item(inv, "apple")
    assert result is inv


# --- get_total_value ---

def test_get_total_value_empty():
    assert get_total_value({}) == 0.0

def test_get_total_value_single_item():
    inv = {"apple": {"quantity": 10, "price": 0.99}}
    assert get_total_value(inv) == 9.90

def test_get_total_value_multiple_items():
    inv = {
        "apple": {"quantity": 15, "price": 0.99},
        "banana": {"quantity": 5, "price": 0.59},
    }
    assert get_total_value(inv) == 17.80

def test_get_total_value_rounded():
    inv = {"widget": {"quantity": 3, "price": 0.1}}
    assert get_total_value(inv) == 0.30


# --- find_item ---

def test_find_item_found():
    inv = {"apple": {"quantity": 10, "price": 0.99}}
    result = find_item(inv, "apple")
    assert result == {"quantity": 10, "price": 0.99}

def test_find_item_case_insensitive():
    inv = {"apple": {"quantity": 10, "price": 0.99}}
    assert find_item(inv, "APPLE") == find_item(inv, "apple")

def test_find_item_not_found():
    inv = {}
    assert find_item(inv, "apple") is None
