function calcNumAstNodes(code) {
    return code.length
}

class CodeStateTracker {
    constructor() {
        this.currentCodeState = ''
    }

    updateCode(editEvent, i) {
        const codeAdded = editEvent['InsertText']
        const codeRemoved = editEvent['DeleteText']
    
        if (codeAdded == '' && codeRemoved == '') {
            return
        }
    
        if (editEvent['SourceLocation'] == '') {
            return
        }
    
        const editPosition = parseFloat(editEvent['SourceLocation'])
        const plannedRemove = this.currentCodeState.slice(editPosition, editPosition + codeRemoved.length)
        if ( plannedRemove !== codeRemoved) {
            throw new Exception("Code removed doesn't match event")
        }
        const result = this.currentCodeState.slice(0, editPosition) + codeAdded + 
            this.currentCodeState.slice(editPosition + codeRemoved.length, this.currentCodeState.length)
        this.currentCodeState = result
    }
}

class AstNodeCountChart {
    constructor() {
        this.astNodeCounts = []
        this.codeStateTracker = new CodeStateTracker()
    }

    newRow(row, i) {
        this.codeStateTracker.updateCode(row, i)
        this.astNodeCounts[i] = calcNumAstNodes(this.codeStateTracker.currentCodeState)
    }

    create(df) {
        console.log('Creating a new ast node count chart with a data frame!')

        df.forEach((row, i) => {
            this.newRow(row, i)
        });

        console.log(this.astNodeCounts)
    }

}
