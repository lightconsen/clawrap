# Changelog

All notable changes to Clawrap will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Bilingual documentation (English and Chinese)
- GitHub issue templates for bug reports, feature requests, and questions
- CONTRIBUTING.md guide for contributors
- CODE_OF_CONDUCT.md based on Contributor Covenant
- SECURITY.md for responsible vulnerability disclosure
- MIT License

### Changed
- README reorganized with separate files for English (README.md) and Chinese (README.zh.md)
- Documentation moved to dedicated `docs/` directory

### Fixed
- Asset type declarations for CI build
- GitHub Actions workflow trigger for incremental build versions (e.g., 1.0.4-build → 1.0.5-build)

## [1.0.3] - 2026-03-26

### Added
- OAuth 2.0 PKCE-based authentication for model providers
- Post-merge git hook to auto-bump version on main branch
- Automatic OpenClaw installation if not present
- Cross-platform installers (macOS, Windows, Linux)
- Visual setup wizard for first-run configuration
- Multi-model support with preset configurations

### Changed
- Migrated renderer to React SPA
- Simplified Add Model modal UI

### Fixed
- App quitting after setup completion
- Logo path in install view

## [1.0.0] - 2026-03-xx

### Added
- Initial release
- OpenClaw gateway management
- Electron wrapper for OpenClaw web terminal
- Basic settings configuration
