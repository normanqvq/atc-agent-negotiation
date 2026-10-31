import { Component } from 'react'

// if anything in the console throws (say the backend returns an odd shape),
// show a small message instead of a white screen for the whole deck
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <section className="slide">
          <div className="slide-inner">
            <h2>Something broke on this page</h2>
            <p className="mono muted">{String(this.state.error.message || this.state.error)}</p>
            <div className="btn-row">
              <button className="btn" onClick={() => this.setState({ error: null })}>Try again</button>
            </div>
          </div>
        </section>
      )
    }
    return this.props.children
  }
}
