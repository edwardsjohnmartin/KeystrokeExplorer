import ast
import json
from browser import window

def get_display_name(ast_node):
    return type(ast_node).__name__


def get_node_data(ast_node):
    result = {
        "ast_node_type": get_display_name(ast_node),
        "children": [get_node_data(child) for child in ast.iter_child_nodes(ast_node)]
    }
    for field in ast_node._fields:
        assert field != "children"
        assert field != "ast_node_type"
        retrieved_attribute = ast_node.__getattribute__(field)
        if type(retrieved_attribute) == str:
            result[field] = retrieved_attribute
    return result


def build_ast(program: str) -> str:
    parsed_ast = ast.parse(program)
    tree = get_node_data(parsed_ast)

    json_tree = json.dumps(tree)
    return json_tree


window.brythonListener = build_ast
