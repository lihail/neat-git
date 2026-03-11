# Changelog

## v0.4.0 - March 8, 2026

### User-facing changes

- Added a Windows version
- Added rename detection for unstaged changes
- Added right-click context menu for changed files
- Added app settings drawer
- Added an option to support NeatGit with a one-time donation
- Fixed a bug where global git config was ignored
- Fixed a bug where clicking stash would not stash new (untracked) files
- Changed app icons
- Pushing local branch with no tracking remote now automatically configures the upstream branch, instead of showing an error toast
- Fixed a bug where renaming a local branch with tracking remote would cause push to fail with an error toast
- Fixed a bug where user preferences did not save on abrupt app close
- Changed "stash and switch branch" toast (that appeared when trying to switch branch with uncommitted changes) to dialog, essentially fixing some bugs with the toast behavior
- Fixed a bug where new files ignored by git would still display in the unstaged changes section
- Fixed a bug where creating a stash would use default user name and email instead of the real git user identity
- Fixed a bug where staged files would sometimes show all lines as changed in the diff viewer due to line ending normalization issues
- Fixed a bug where renaming a local branch would prevent the remote "behind" commit indicator count from appearing after a fetch
- Fixed a bug where the diff was not shown for an unstaged added file when a deletion of the same file was staged
- Fixed a bug where the app would sometimes switch to the other version of a file (staged <-> unstaged) when the app window regained focus
- Fixed a bug where clicking "Browse" or "Create" in main app menu would open two folder selection dialogs
- Changed colors across the app
- Stash button is now disabled when there are no uncommitted changes
- Switching to a tab of a repo that does not exist on disk now automatically closes that tab with a proper error toast
- Improved button styling and consistency across the app
- Redesigned branch right-click context menu
- Ensured file changes are displayed in alphabetical order in staged and unstaged sections
- Changed tooltip location in the rename branch dialog
- Moved commit button icon to appear after the text
- Changed wording in SSH trust dialog

### Behind the scenes

- Updated the readme file
- Added electron backend debug configuration
- Fixed incorrect types across the codebase
- Moved shared components from `src/components/git` folder to a new `src/components/common` folder and gave them generic names
- Removed unnecessary window object checks
- Added linter to run before build
- Added a script, `generate-icons`, for generating icons to all platforms using a single source file `icon.svg`
- Improved components on click handler types
- Added content security policy to the app
- Changed linter rule
- Added linter rule
- Refactored code
- Corrected wording in previous changelog file entries
- Fixed typo in component name
- Removed duplicate interfaces
- Removed unused file

## v0.3.0 - Feb. 8, 2026

### User-facing changes

- Added ability to stage and unstage individual lines and hunks in diff viewer for modified files
- App now includes its own git, no longer requires git to be installed on the user's machine
- Fixed a bug where all stashes of current repo would be deleted upon app start
- Added rename/move detection for files, showing an appropriate icon and the old and new file paths
- Fixed a bug where new files in new folders would show truncated paths and throw an error when clicked
- Fixed a bug where clicking "Rename" in the rename branch dialog would do nothing
- Fixed a bug where user setup dialog on first app use would not appear
- Fixed a bug where file status icons in staged and unstaged sections would show the same status, even when the actual changes differed
- Fixed a bug where diff viewer would show stale content when selected file was removed from the changed files list
- Fixed a bug where regaining window focus would reload the diff with the wrong view mode or staged/unstaged section if those settings had changed since the window last lost focus
- Fixed a bug where diff viewer would show identical line numbers for consecutive deleted lines in hunks and full view modes
- App now starts maximized instead of centered in a small window
- Added validation for existing branch names in the create branch dialog
- Added the ability to select text in diff viewer
- Fixed a bug where full and hunks diff viewer modes would show only one line number column instead of two (old and new) side by side
- Fixed a bug where diff viewer would display trailing newline changes at end of files
- Fixed a bug where "Lines x-y" separator in hunks view would scroll horizontally with the content when word wrap is off
- Added sticky vertical scrolling behavior to "Lines x-y" separators in hunks view
- Added timeout for git operations to prevent indefinite hangs
- Added "Save credentials" checkbox when cloning a repository with credentials embedded in the URL
- Fixed a bug where diff viewer would force full mode for staged added files with unstaged changes
- Improved styling consistency across diff viewer section headers (hunks and split view modes)
- Fixed a bug where stored keychain credentials could be used as fallback when user-provided credentials failed authentication
- Fixed "Save credentials" checkbox not working when authenticating during clone operations - credentials are now properly saved when the option is selected
- Close tab and open repository buttons are now disabled during remote operations
- Added a message when the app is opened in a browser instead of Electron, preventing usage in the browser
- Renamed "Open Repository" tooltip to "Add Repository"
- Removed a duplicate empty state in Changed Files sidebar
- Added upward bounce animation to the Push button while pushing, matching the Pull button's downward bounce style
- Standardized Git hosting service references across the app
- Fixed a security vulnerability where malicious SSH hostnames in clone URLs could execute arbitrary shell commands
- Fixed a security vulnerability where authentication credentials could be temporarily written to disk in plain text

### Behind the scenes

- Switched from system git to dugite for all git CLI operations, bundling git with the app
- Bundled git-credential-osxkeychain binary with the app for credential storage
- Added issues section to the readme file
- Added license to the repo
- Changed the stash logic to work with native isomorphic-git stash action
- Added top-level Electron detection guard in `App.tsx` - the app now checks for `window.electronAPI` once at startup
- Refactored code
- Added Prettier to the repo and prettified files
- Normalized line endings to LF in all files
- Added ESLint rules and fixed all lint issues in the repo
- Added TypeScript type checking during development with vite-plugin-checker, which displays errors in both the terminal and browser overlay
- Renamed license file
- Removed an unused, empty file

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
- Fixed a bug preventing checkout of remote-only branches when double-clicking them
- Added cloud/laptop icons to local branches for branches tracking/not tracking a remote respectively
- Added "Stash & Switch" option when attempting to switch branches with uncommitted changes
- Improved error message formatting for better readability
- Removed wrong cursor pointer in diff viewer
- Removed stage/unstage buttons from diff viewer as they were not working. A permanent, working alternative will be added in the future
- Moved "New Branch" button from local branches section to the top right action buttons
- Fixed a bug where files with partially staged changes would only appear in either the staged or unstaged changes sections
- Fixed few bugs in diff viewer and staged/unstaged changes sections
- Fixed a bug where a repo's toasts would show even after switching repo
- Fixed a bug where file status icons would shrink when file paths are long in staged/unstaged changes sections
- Removed staged file count display from Commit button
- Improved UX in staged/unstaged changes sections: stage/unstage buttons now only appear on hover and take no space when hidden, improving readability in long file paths
- Added app version display to welcome screen

### Behind the scenes

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
