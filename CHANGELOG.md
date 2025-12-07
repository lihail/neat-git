# Changelog

## v0.2.0 - Dec. 7, 2025

### User-facing changes

- Added syntax highlighting to diff viewer
- Added Full, Hunks, and Split view modes to diff viewer
- Removed checkmark from active branch in branch list
- Added commit indicators to local branches in branch list showing commits behind (↓) and ahead (↑) of remote
- Added auto-fetch every 5 minutes for active repo tab (also fetches on tab switch)
- Disabled tab switching while any fetch/pull/push operation is in progress
- Implemented functionality for the "Pull" option to local branches in the branch right-click menu
- Implemented functionality for the "Copy Branch Name" option to local branches in the branch right-click menu
- Implemented functionality for the "Rename Branch" option to local branches in the branch right-click menu
- Disabled pull option for branches without upstream tracking in the branch right-click menu
- Disabled delete option for current branch in the branch right-click menu
- For local branches tracking a remote, added remote branch name in the branch right-click menu
- For local branches tracking a remote, added "Copy Remote Branch Name" option in the branch right-click menu
- Fixed overflow bug where long branch names would escape their container instead of truncating with ellipsis
- Fixed bug preventing checkout of remote-only branches when double-clicking them
- Added cloud/laptop icons to local branches for branches tracking/not tracking a remote respectively
- Added "Stash & Switch" option when attempting to switch branches with uncommitted changes
- Improved error message formatting for better readability
- Removed wrong cursor pointer in diff viewer
- Removed stage/unstage buttons from diff viewer as they were not working. A permanent, working alternative will be added in the future
- Moved "New Branch" button from local branches section to the top right action buttons
- Fixed bug where files with partially staged changes would only appear in either the staged or unstaged changes sections
- Fixed few bugs in diff viewer and staged/unstaged changes sections
- Fixed bug where a repo's toasts would show even after switching repo
- Fixed bug where file status icons would shrink when file paths are long in staged/unstaged changes sections
- Removed staged file count display from Commit button
- Improved UX in staged/unstaged changes sections: stage/unstage buttons now only appear on hover and take no space when hidden, improving readability in long file paths
- Added app version display to welcome screen

### Behind the scenes:

- Added this changelog file
- Rewrote the readme file
- Added information to package.json
- Removed Linux build options from package.json, since there's no plan to support Linux
- Removed routing code
- Removed mobile-devices-related code
- Removed unused radix-ui Toaster component
- Refactored code

## v0.1.0 - Nov. 24, 2025

- Initial release
