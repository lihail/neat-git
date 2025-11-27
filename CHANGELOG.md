# Changelog

## v0.2.0

- Added this changelog file
- Removed checkmark from active branch in branch list
- Added commit indicators to local branches in branch list showing commits behind (↓) and ahead (↑) of remote
- Added auto-fetch every 5 minutes for active repo tab (also fetches on tab switch)
- Disabled tab switching while any fetch/pull/push operation is in progress
- Implemented functionality for the "Pull" option to local branches in the branch right-click menu
- Implemented functionality for the "Copy Branch Name" option to local branches in the branch right-click menu
- Implemented functionality for the "Rename Branch" option to local branches in the branch right-click menu
- Disabled pull option for branches without upstream tracking in the branch right-click menu
- Disabled delete option for current branch in the branch right-click menu

### Behind the scenes:
- Rewrote the readme file
- Added information to package.json
- Removed Linux build options from package.json, since there's no plan to support it

## v0.1.0

- Initial release

