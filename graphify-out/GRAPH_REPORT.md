# Graph Report - TSL---FMM-I-CG-workingHoursCalc  (2026-05-09)

## Corpus Check
- 5 files · ~16,509 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 52 nodes · 90 edges · 8 communities detected
- Extraction: 84% EXTRACTED · 16% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]

## God Nodes (most connected - your core abstractions)
1. `parseTimeFormatToMinutes()` - 7 edges
2. `_recalculateEmployeeRow()` - 7 edges
3. `assignShift()` - 6 edges
4. `renderTable()` - 6 edges
5. `_getShiftCandidatesForEmployee()` - 5 edges
6. `_scoreShiftCandidate()` - 5 edges
7. `_getActiveShiftDefinitions()` - 4 edges
8. `_getNearestDefaultShift()` - 4 edges
9. `handlePipoFileSelect()` - 4 edges
10. `formatMinutesTo24h()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `calculateDutyHours()` --calls--> `_recalculateEmployeeRow()`  [INFERRED]
  hoursProcessing.js → uploadProcessFiles.js
- `calculateOtHours()` --calls--> `_recalculateEmployeeRow()`  [INFERRED]
  hoursProcessing.js → uploadProcessFiles.js
- `assignShift()` --calls--> `_recalculateEmployeeRow()`  [INFERRED]
  hoursProcessing.js → uploadProcessFiles.js
- `sortArrowsHtml()` --calls--> `renderTable()`  [INFERRED]
  main.js → renderTable.js
- `reprocessData()` --calls--> `renderTable()`  [INFERRED]
  main.js → renderTable.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.31
Nodes (6): normalizeDate(), _finalizePipoProcessing(), handlePipoFileSelect(), handlePresenteeFileSelect(), processPipoFile(), processPresenteeFile()

### Community 1 - "Community 1"
Cohesion: 0.43
Nodes (6): _estimateShiftOverlapMins(), _getActiveShiftDefinitions(), _normalizeShiftKey(), _resolveShiftDefinitionKey(), _scoreShiftCandidate(), _timeDiffMinutes()

### Community 2 - "Community 2"
Cohesion: 0.36
Nodes (5): reprocessData(), sortArrowsHtml(), toggleDateSort(), toggleSort(), renderTable()

### Community 3 - "Community 3"
Cohesion: 0.38
Nodes (7): calculateDutyHours(), calculateHours(), calculateOtHours(), formatMinutesTo24h(), parseTimeFormatToMinutes(), _excelTimeToHHMM(), _recalculateEmployeeRow()

### Community 4 - "Community 4"
Cohesion: 0.57
Nodes (6): employeewiseTotalHours(), exportToExcel(), getEmployeeAggregatedData(), getSkillAggregatedData(), renderAggregatedTable(), skillwiseTotalHours()

### Community 5 - "Community 5"
Cohesion: 0.47
Nodes (3): handleMasterFileUpload(), _parseEmployeeDetailsSheet(), _parseShiftDefinitionsSheet()

### Community 6 - "Community 6"
Cohesion: 0.67
Nodes (4): assignShift(), _getDefaultShiftDefinitions(), _getNearestDefaultShift(), _sortShiftCandidates()

### Community 7 - "Community 7"
Cohesion: 0.67
Nodes (3): _getEmployeeMasterDetails(), _getShiftCandidatesForEmployee(), isPunchInForOvernightShift()

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `renderTable()` connect `Community 2` to `Community 0`, `Community 4`?**
  _High betweenness centrality (0.446) - this node is a cross-community bridge._
- **Why does `_recalculateEmployeeRow()` connect `Community 3` to `Community 0`, `Community 6`?**
  _High betweenness centrality (0.341) - this node is a cross-community bridge._
- **Why does `handlePresenteeFileSelect()` connect `Community 0` to `Community 2`?**
  _High betweenness centrality (0.269) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `parseTimeFormatToMinutes()` (e.g. with `_excelTimeToHHMM()` and `_recalculateEmployeeRow()`) actually correct?**
  _`parseTimeFormatToMinutes()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `_recalculateEmployeeRow()` (e.g. with `assignShift()` and `parseTimeFormatToMinutes()`) actually correct?**
  _`_recalculateEmployeeRow()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `renderTable()` (e.g. with `toggleSort()` and `reprocessData()`) actually correct?**
  _`renderTable()` has 5 INFERRED edges - model-reasoned connections that need verification._