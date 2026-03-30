name: Pull Request Template
about: Create a pull request to contribute to Clawrap
title: ''
labels: ''
body:
  - type: markdown
    attributes:
      value: |
        Thanks for your contribution! Please fill out the checklist below to help reviewers.

  - type: textarea
    id: description
    attributes:
      label: Description
      description: Briefly describe the changes in this PR.
      placeholder: What does this PR do?
    validations:
      required: true

  - type: textarea
    id: motivation
    attributes:
      label: Motivation and Context
      description: Why is this change needed? What problem does it solve?
      placeholder: Link to related issues if applicable (e.g., "Fixes #123")
    validations:
      required: true

  - type: textarea
    id: testing
    attributes:
      label: How Has This Been Tested?
      description: Describe how you tested these changes.
      placeholder: |
        - [ ] Tested locally
        - [ ] Added/updated tests
    validations:
      required: true

  - type: checkboxes
    id: checklist
    attributes:
      label: Checklist
      description: Before submitting, please ensure you have completed the following:
      options:
        - label: My code follows the project's code style
        - label: I have commented my code where applicable
        - label: I have updated the documentation if needed
        - label: I have tested the changes locally
        - label: My changes generate no new warnings/errors
    validations:
      required: true

  - type: input
    id: issues
    attributes:
      label: Related Issues
      description: Link any related issues (e.g., "Fixes #123" or "Related to #456")
      placeholder: "#123"
    validations:
      required: false
