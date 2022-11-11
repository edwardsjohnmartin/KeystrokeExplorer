print('Loading ast building python script')

import ast
import json
from browser import window

def get_display_name(ast_node):
    return type(ast_node).__name__


def get_node_data(ast_node):
    return {
        "name": get_display_name(ast_node),
        "children": [get_node_data(child) for child in ast.iter_child_nodes(ast_node)]
    }

def build_ast(program: str) -> str:
    print('running build_ast on python side')
    parsed_ast = ast.parse(program)
    tree = get_node_data(parsed_ast)

    json_tree = json.dumps(tree)
    return json_tree

window.brythonListener = build_ast
