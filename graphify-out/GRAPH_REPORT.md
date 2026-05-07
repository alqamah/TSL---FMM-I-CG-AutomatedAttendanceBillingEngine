# Graph Report - TSL---FMM-I-CG-workingHoursCalc  (2026-05-04)

## Corpus Check
- 6 files · ~29,353 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 41 nodes · 64 edges · 5 communities detected
- Extraction: 78% EXTRACTED · 22% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]

## God Nodes (most connected - your core abstractions)
1. `_recalculateEmployeeRow()` - 7 edges
2. `renderTable()` - 6 edges
3. `parseTimeFormatToMinutes()` - 5 edges
4. `handlePipoFileSelect()` - 4 edges
5. `handlePresenteeFileSelect()` - 4 edges
6. `formatMinutesTo24h()` - 3 edges
7. `calculateHours()` - 3 edges
8. `assignShift()` - 3 edges
9. `toggleSort()` - 3 edges
10. `_excelTimeToHHMM()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `_recalculateEmployeeRow()` --calls--> `calculateDutyHours()`  [INFERRED]
  uploadProcessFiles.js → hoursProcessing.js
- `_recalculateEmployeeRow()` --calls--> `calculateOtHours()`  [INFERRED]
  uploadProcessFiles.js → hoursProcessing.js
- `sortArrowsHtml()` --calls--> `renderTable()`  [INFERRED]
  main.js → renderTable.js
- `reprocessData()` --calls--> `renderTable()`  [INFERRED]
  main.js → renderTable.js
- `renderTable()` --calls--> `handlePipoFileSelect()`  [INFERRED]
  renderTable.js → uploadProcessFiles.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.38
Nodes (8): assignShift(), calculateDutyHours(), calculateHours(), calculateOtHours(), formatMinutesTo24h(), parseTimeFormatToMinutes(), _excelTimeToHHMM(), _recalculateEmployeeRow()

### Community 1 - "Community 1"
Cohesion: 0.33
Nodes (7): normalizeDate(), handlePipoFileSelect(), handlePresenteeFileSelect(), _mergeDuplicatePipoRows(), processPipoFile(), processPresenteeFile(), _resolveCShiftCrossDate()

### Community 2 - "Community 2"
Cohesion: 0.36
Nodes (5): reprocessData(), sortArrowsHtml(), toggleDateSort(), toggleSort(), renderTable()

### Community 3 - "Community 3"
Cohesion: 0.57
Nodes (6): employeewiseTotalHours(), exportToExcel(), getEmployeeAggregatedData(), getSkillAggregatedData(), renderAggregatedTable(), skillwiseTotalHours()

### Community 4 - "Community 4"
Cohesion: 0.47
Nodes (3): handleMasterFileUpload(), _parseEmployeeDetailsSheet(), _parseShiftDefinitionsSheet()

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `renderTable()` connect `Community 2` to `Community 1`, `Community 3`?**
  _High betweenness centrality (0.514) - this node is a cross-community bridge._
- **Why does `_recalculateEmployeeRow()` connect `Community 0` to `Community 1`?**
  _High betweenness centrality (0.405) - this node is a cross-community bridge._
- **Why does `_excelTimeToHHMM()` connect `Community 0` to `Community 4`?**
  _High betweenness centrality (0.254) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `_recalculateEmployeeRow()` (e.g. with `assignShift()` and `parseTimeFormatToMinutes()`) actually correct?**
  _`_recalculateEmployeeRow()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `renderTable()` (e.g. with `toggleSort()` and `reprocessData()`) actually correct?**
  _`renderTable()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `parseTimeFormatToMinutes()` (e.g. with `_excelTimeToHHMM()` and `_recalculateEmployeeRow()`) actually correct?**
  _`parseTimeFormatToMinutes()` has 2 INFERRED edges - model-reasoned connections that need verification._