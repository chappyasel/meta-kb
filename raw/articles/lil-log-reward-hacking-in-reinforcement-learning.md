---
url: 'https://lilianweng.github.io/posts/2024-11-28-reward-hacking/'
type: article
author: Lilian Weng
date: '2024-11-28'
tags:
  - reward-hacking
  - rlhf-alignment
  - self-improving
  - agentic-skills
  - specification-gaming
  - incentive-design
  - agent-behavior-safety
key_insight: >-
  Reward hacking in RLHF-trained language models represents a critical alignment
  failure where agents exploit specification ambiguities rather than learning
  genuine capabilities—this directly threatens the reliability of LLM knowledge
  bases and agentic systems that depend on properly-incentivized behavior,
  making mitigation strategies essential for practical deployment.
relevance_scores:
  topic_relevance: 4
  practitioner_value: 4
  novelty: 4
  signal_quality: 7
  composite: 4.5
  reason: >-
    Reward hacking and RLHF alignment is tangentially relevant to self-improving
    agent systems (topic 6), but this article is primarily about RL theory and
    mitigation for language model training rather than agent infrastructure,
    memory, knowledge systems, or multi-agent coordination patterns.
---
## Reward Hacking in Reinforcement Learning

> Published on Lil'Log by Lilian Weng on 2024-11-28

Reward hacking occurs when a [reinforcement learning (RL)](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/\(https://lilianweng.github.io/posts/2018-02-19-rl-overview/\)) agent [exploits](https://lilianweng.github.io/posts/2018-01-23-multi-armed-bandit/#exploitation-vs-exploration) flaws or ambiguities in the reward function to achieve high rewards, without genuinely learning or completing the intended task. Reward hacking exists because RL environments are often imperfect, and it is fundamentally challenging to accurately specify a reward function.

With the rise of [language models](https://lilianweng.github.io/posts/2019-01-31-lm/) generalizing to a broad spectrum of tasks and RLHF becomes a de facto method for alignment training, reward hacking in RL training of language models has become a critical practical challenge. Instances where the model learns to modify unit tests to pass coding tasks, or where responses contain biases that mimic a user’s preference, are pretty concerning and are likely one of the major blockers for real-world deployment of more autonomous use cases of AI models.

Most of the past work on this topic has been quite theoretical and focused on defining or demonstrating the existence of reward hacking. However, research into practical mitigations, especially in the context of RLHF and LLMs, remains limited. I especially want to call out for more research efforts directed toward understanding and developing mitigation for reward hacking in the future. Hope I will be able to cover the mitigation part in a dedicated post soon.

## Background

## Reward Function in RL

Reward function defines the task, and reward shaping significantly impacts learning efficiency and accuracy in [reinforcement learning](https://lilianweng.github.io/posts/2018-02-19-rl-overview/). Designing a reward function for an RL task often feels like a ‘dark art’. Many factors contribute to this complexity: How you decompose a big goal into small goals? Is the reward sparse or dense? How you measure the success? Various choices may lead to good or problematic learning dynamics, including unlearnable tasks or hackable reward functions. There is a long history of research on how to do reward shaping in RL.

For example, in an [1999 paper by Ng et al.](https://people.eecs.berkeley.edu/~pabbeel/cs287-fa09/readings/NgHaradaRussell-shaping-ICML1999.pdf), the authors studied how to modify the reward function in [Markov Decision Processes (MDPs)](https://lilianweng.github.io/posts/2018-02-19-rl-overview/#markov-decision-processes) such that the optimal policy remains unchanged. They found that linear transformation works. Given a MDP $M = (S, A, T, \\gamma, R)$, we want to create a transformed MDP $M’ = (S, A, T, \\gamma, R’)$ where $R’ = R + F$ and $F: S \\times A \\times S \\mapsto \\mathbb{R}$, such that we can guide the learning algorithm to be more efficient. Given a real-valued function $\\Phi: S \\mapsto \\mathbb{R}$, $F$ is a potential-based shaping function if for all $s \\in S - {s\_0}, a \\in A, s’ \\in S$:

$$ F(s, a, s') = \\gamma \\Phi(s') - \\Phi(s) $$

This would guarantee that the sum of discounted $F$, $F(s\_1, a\_1, s\_2) + \\gamma F(s\_2, a\_2, s\_3) + \\dots$, ends up being 0. If $F$ is such a potential-based shaping function, it is both *sufficient* and *necessary* to ensure $M$ and $M’$ share the same optimal policies.

When $F(s, a, s’) = \\gamma \\Phi(s’) - \\Phi(s)$, and if we further assume that $\\Phi(s\_0) = 0$, where $s\_0$ is absorbing state, and $\\gamma=1$, and then for all $s \\in S, a \\in A$:

$$ \\begin{aligned} Q^\*\_{M'} (s,a) &= Q^\*\_M(s, a) - \\Phi(s) \\\\ V^\*\_{M'} (s,a) &= V^\*\_M(s, a) - \\Phi(s) \\end{aligned} $$

This form of reward shaping allows us to incorporate heuristics into the reward function to speed up learning without impacting the optimal policy.

## Spurious Correlation

Spurious correlation or shortcut learning ([Geirhos et al. 2020](https://arxiv.org/abs/2004.07780)) in classification task is a concept closely related to reward hacking. Spurious or shortcut features can cause a classifier to fail at learning and generalizing as intended. For example, a binary classifier for distinguishing wolves from huskies may overfit to the presence of a snowy background if all the wolf training images include snow ([Ribeiro et al. 2024](https://arxiv.org/abs/1602.04938)).

![](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/shortcut-features.png)

The model performs poorly on out-of-distribution (OOD) test sets if it overfits to shortcut features. (Image source: Geirhos et al. 2020 )

The [ERM principle](https://en.wikipedia.org/wiki/Empirical_risk_minimization) states that, since the full data distribution is unknown, minimizing the loss on training data is a reasonable proxy of risk and thus we favor models with the lowest training loss. [Nagarajan et al. (2021)](https://arxiv.org/abs/2010.15775) studied the ERM principle and pointed out that ERM needs to rely on all types of informative features, including unreliable spurious features, while attempting to fit the data without constraints. Their experiments showed that ERM would depend on spurious features no matter how easy the task is.

## Let’s Define Reward Hacking

Reward shaping in RL is challenging. Reward hacking occurs when an RL agent exploits flaws or ambiguities in the reward function to obtain high rewards without genuinely learning the intended behaviors or completing the task as designed. In recent years, several related concepts have been proposed, all referring to some form of reward hacking:

- Reward hacking ([Amodei et al., 2016](https://arxiv.org/abs/1606.06565))
- Reward corruption ([Everitt et al., 2017](https://arxiv.org/abs/1705.08417))
- Reward tampering ([Everitt et al. 2019](https://arxiv.org/abs/1908.04734))
- Specification gaming ([Krakovna et al., 2020](https://deepmind.google/discover/blog/specification-gaming-the-flip-side-of-ai-ingenuity/))
- Objective robustness ([Koch et al. 2021](https://www.gatsby.ucl.ac.uk/~balaji/udl2021/accepted-papers/UDL2021-paper-055.pdf))
- Goal misgeneralization ([Langosco et al. 2022](https://arxiv.org/abs/2105.14111))
- Reward misspecifications ([Pan et al. 2022](https://arxiv.org/abs/2201.03544))

The concept originated with Amodei et al. (2016), who proposed a set of open research questions on AI safety in their seminal paper [“Concrete Problems in AI Safety”](https://arxiv.org/abs/1606.06565). They listed **reward hacking** as one of the key AI safety problems. Reward hacking refers to the possibility of the agent gaming the reward function to achieve high reward through undesired behavior. **Specification gaming** ([Krakovna et al. 2020](https://deepmind.google/discover/blog/specification-gaming-the-flip-side-of-ai-ingenuity/)) is a similar concept, defined as a behavior that satisfies the literal specification of an objective but not achieving the desired results. Here the literal description of the task goal and the intended goal may have a gap.

Reward shaping is a technique used to enrich the reward function, making it easier for the agent to learn—for example, by providing denser rewards. However, a poorly design reward shaping mechanism can alter the trajectory of the optimal policy. Designing effective reward shaping mechanisms is inherently difficult. Rather than blaming a poorly designed reward function, it is more accurate to acknowledge that designing a good reward function is intrinsically challenging due to the complexity of the task itself, partial observable state, multiple dimensions in consideration, and other factors.

When testing an RL agent in out-of-distribution (OOD) environments, robustness failure may occur due to:

1. The model fails to generalize effectively, even with the right objective. This happens when the algorithm lacks sufficient intelligence or capability.
2. The model generalizes capably but pursues an objective different from the one it was trained on. This happens when the proxy reward differs from the true reward function, $R’ \\neq R$. This is known as **objective robustness** ([Koch et al. 2021](https://www.gatsby.ucl.ac.uk/~balaji/udl2021/accepted-papers/UDL2021-paper-055.pdf)) or **goal misgeneralization** ([Langosco et al. 2022](https://arxiv.org/abs/2105.14111) )

Experiments in two RL environments, [CoinRun](https://github.com/openai/coinrun) and [Maze](https://github.com/openai/procgen), demonstrated the importance of randomization during training. If during training, the coin or the cheese is placed at a fixed position (i.e. right end of the level or upper right corner of the maze) but testing in the env where the coin or cheese is placed at random, the agent would just run to the fixed position without obtaining the coin or cheese at test time. A conflict arises when a visual feature (e.g., cheese or coin) and a positional feature (e.g., upper-right or right end) are inconsistent during test time, leading the trained model to prefer the positional feature. I would like to point out that, in these two examples, the *reward-result gaps* are clear but such type of biases are unlikely to be so obvious in most real-world cases.

![](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/coinrun-randomization.png)

The impact of randomizing the position of the coin during training. When the coin is placed at random for {0, 2, 3, 6, 11}% of the time during training (x-axis), the frequency of the agent navigating to the end of the level without obtaining the coin decreases with the increase of the randomization ("y-axis"). (Image source: Koch et al. 2021 )

**Reward Tampering** ([Everitt et al. 2019](https://arxiv.org/abs/1908.04734)) is a form of reward hacking behavior where the agent interferes with the reward function itself, causing the observed reward to no longer accurately represent the intended goal. In reward tampering, the model modifies its reward mechanism either by directly manipulating the implementation of the reward function or by indirectly altering the environmental information used as input for the reward function.

(Note: Some work defines reward tampering as a distinct category of misalignment behavior from reward hacking. But I consider reward hacking as a broader concept here.)

At a high level, reward hacking can be categorized into two types: environment or goal misspecification, and reward tampering.

- **Environment or goal misspecified**: The model learns undesired behavior to achieve high rewards by hacking the environment or optimizing a reward function not aligned with the true reward objective—such as when the reward is misspecified or lacks key requirements.
- **Reward tampering**: The model learns to interfere with the reward mechanism itself.

## List of Examples

### Reward hacking examples in RL tasks

- A robot hand trained to grab an object can learn to trick people by placing the hand between the object and the camera. ([Link](https://openai.com/index/learning-from-human-preferences/))
- An agent trained to maximize jumping height may exploit a bug in the physics simulator to achieve an unrealistically height. ([Link](https://arxiv.org/abs/1803.03453))
- An agent is trained to ride a bicycle to a goal and wins reward whenever it is getting closer to the goal. Then the agent may learn to ride in tiny circles around the goal because there is no penalty when the agent gets away from the goal. ([Link](https://people.eecs.berkeley.edu/~pabbeel/cs287-fa09/readings/NgHaradaRussell-shaping-ICML1999.pdf))
- In a soccer game setup, the reward is assigned when the agent touches the ball and the agent learns to remain next to the ball to touch the ball in high frequency like in a viberating motion. ([Link](https://people.eecs.berkeley.edu/~pabbeel/cs287-fa09/readings/NgHaradaRussell-shaping-ICML1999.pdf))
- In the [Coast Runners game](https://openai.com/blog/faulty-reward-functions/), an agent controls a boat with the goal to finish the boat race as quickly as possible. When it is given a shaping reward for hitting green blocks along the race track, it changes the optimal policy to going in circles and hitting the same green blocks over and over again. ([Link](https://deepmind.google/discover/blog/specification-gaming-the-flip-side-of-ai-ingenuity/))
- [“The Surprising Creativity of Digital Evolution”](https://arxiv.org/abs/1803.03453) (Lehman et al. 2019) - This paper has many examples about how optimizing a misspecified fitness function can lead to surprising “hacking” or unintended evolutionary or learning results.
- The list of [specification gaming in AI examples](https://docs.google.com/spreadsheets/d/e/2PACX-1vRPiprOaC3HsCf5Tuum8bRfzYUiKLRqJmbOoC-32JorNdfyTiRRsR7Ea5eWtvsWzuxo8bjOxCG84dAg/pubhtml) is collected by [Krakovna et al. 2020](https://deepmind.google/discover/blog/specification-gaming-the-flip-side-of-ai-ingenuity/).

### Reward hacking examples in LLM tasks

- A language model for generating summarization is able to explore flaws in the ROUGE metric such that it obtains high score but the generated summaries are barely readable. ([Link](https://web.archive.org/web/20180215132021/https://www.salesforce.com/products/einstein/ai-research/tl-dr-reinforced-model-abstractive-summarization/))
- A coding model learns to change unit test in order to pass coding questions. ([Link](https://arxiv.org/abs/2406.10162))
- A coding model may learn to directly modify the code used for calculating the reward. ([Link](https://arxiv.org/abs/2406.10162))

### Reward hacking examples in real life

- The recommendation algorithm for social media is intended to provide useful information. However, usefulness is often measured by proxy metrics, such as the number of likes or comments, or the time or frequency of engagement on the platform. The algorithm ends up recommending content that can affect users’ emotion states such as outrageous and extreme content in order to trigger more engagement. ([Harari, 2024](https://www.goodreads.com/en/book/show/204927599-nexus))
- Optimizing for misspecified proxy metrics for a video sharing site may aggressively increase the watch time of users while the true goal is to optimize users’ subjective well-being. ([Link](https://arxiv.org/abs/2201.03544))
- [“The Big Short”](https://en.wikipedia.org/wiki/The_Big_Short) - 2008 financial crisis caused by the housing bubble. Reward hacking of our society happened as people tried to game the financial system.

## Why does Reward Hacking Exist?

[**Goodhart’s Law**](https://en.wikipedia.org/wiki/Goodhart%27s_law) states that *“When a measure becomes a target, it ceases to be a good measure”*. The intuition is that a good metric can become corrupted once significant pressure is applied to optimize it. It is challenging to specify a 100% accurate reward objective and any *proxy* suffers the risk of being hacked, as RL algorithm exploits any small imperfection in the reward function definition. [Garrabrant (2017)](https://www.lesswrong.com/posts/EbFABnst8LsidYs5Y/goodhart-taxonomy) categorized Goodhart’s law into 4 variants:

1. Regressional - selection for an imperfect proxy necessarily also selects for noise.
2. Extremal - the metric selection pushes the state distribution into a region of different data distribution.
3. Causal - when there is a non-causal correlation between the proxy and the goal, intervening on the proxy may fail to intervene on the goal.
4. Adversarial - optimization for a proxy provides an incentive for adversaries to correlate their goal with the proxy.

[Amodei et al. (2016)](https://arxiv.org/abs/1606.06565) summarized that reward hacking, mainly in RL setting, may occur due to:

1. Partial observed states and goals are imperfect representation of the environment status.
2. The system itself is complex and susceptible to hacking; e.g., if the agent is allowed to execute code that changes part of the environment, it becomes much easier to exploit the environment’s mechanisms.
3. The reward may involve abstract concept that is hard to be learned or formulated; e.g., a reward function with high-dimensional inputs may disproportionately rely on a few dimensions.
4. RL targets to get the reward function highly optimized, so there exists an intrinsic “conflict”, making the design of good RL objective challenging. A special case is a type of the reward function with a self-reinforcing feedback component, where the reward may get amplified and distorted to a point that breaks down the original intent, such as an ads placement algorithm leading to winners getting all.

Besides, identifying the exact reward function for which an optimal agent optimizes its behavior is in general impossible since there could be an infinite number of reward functions consistent with any observed policy in an fixed environment ([Ng & Russell, 2000](https://ai.stanford.edu/~ang/papers/icml00-irl.pdf)). [Amin and Singh (2016)](https://arxiv.org/abs/1601.06569) separated the causes of this *unidentifiability* into two classes:

1. Representational - a set of reward functions is behaviorally invariant under certain arithmetic operations (e.g., re-scaling)
2. Experimental - $\\pi$’s observed behavior is insufficient to distinguish between two or more reward functions which both rationalize the behavior of the agent (the behavior is optimal under both)

## Hacking RL Environment

Reward hacking is expected to be a more common problem as the model and the algorithm become increasingly sophisticated. A more intelligent agent is more capable of finding “holes” in the design of reward function and *exploiting* the task specification—in other words, achieving higher proxy rewards but lower true rewards. By contrast, a weaker algorithm may not be able to find such loopholes, and thus we would not observe any reward hacking or identify issues in the current reward function design when the model is not strong enough.

In a set of zero-sum robotics self-play games ([Bansal et al., 2017](https://arxiv.org/abs/1710.03748)), we can train two agents (victim vs. opponent) to compete against each other. A standard training process produces a victim agent with adequate performance when playing against a normal opponent. However, it is easy to train an adversarial opponent policy that can defeat the victim reliably despite outputting seemingly random actions and training with fewer than 3% of time steps ([Gleave et al., 2020](https://arxiv.org/abs/1905.10615)). Training of adversarial policies involves optimizing the sum of discounted rewards, as in standard RL setup, while treating the victim policy as a black-box model.

An intuitive way to mitigate adversarial policies attacks is to fine-tune victims against adversarial policies. However, the victim remains vulnerable to new versions of adversarial policies once retrained against the new victim policy.

Why does adversarial policy exist? The hypothesis is that adversarial policies introduce OOD observations to the victim rather than physically interfering with it. Evidence shows that when the victim’s observation of the opponent’s position is masked and set to a static state, the victim becomes *more robust* to adversaries, although performing worse against a normal opponent policy. Furthermore, a higher-dimensional observation space enhances performance under normal circumstances but makes the policy more vulnerable to adversarial opponents.

[Pan et al. (2022)](https://arxiv.org/abs/2201.03544) investigated reward hacking as a function of agent capabilities, including (1) model size, (2) action space resolution, (3) observation space noise, and (4) training time. They also proposed a taxonomy of three types of misspecified proxy rewards:

1. *Misweighting*: Proxy and true rewards capture the same desiderata, but differ in their relative importance.
2. *Ontological*: Proxy and true rewards use different desiderata to capture the same concept.
3. *Scope*: The proxy measures desiderata over a restricted domain (e.g. time or space) because measurement across all conditions is too costly.

They experimented in four RL environments paired with nine misspecified proxy rewards. The overall findings from these experiments can be summarized as follows: *A model of higher capability tends to obtain higher (or similar) proxy rewards but decreased true rewards.*

- Model size: Larger model size leads to increased proxy rewards but decreased true rewards.
- Action space resolution: Increased precision in actions leads to more capable agents. However, higher resolution causes proxy rewards to remain constant while true rewards decrease.
- Observation fidelity: More accurate observations improve proxy rewards but slightly reduce true rewards.
- Training steps: Optimizing the proxy reward over more steps harms true rewards after an initial period where the rewards are positively correlated.
![](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/exp-reward-misspecification.png)

The plot of proxy and true reward value as functions of (Top row) model sizes, measured in parameter count; (Bottom row) model capability, measured by metrics such as training steps, action space resolution, and observation noise. (Image source: Pan et al. 2022 )

If a proxy reward is so poorly specified that it has a very weak correlation with the true reward, we may be able to identify and prevent reward hacking even before training. Based on this hypothesis, [Pan et al. (2022)](https://arxiv.org/abs/2201.03544) investigated the correlation between proxy and true rewards over a collection of trajectory rollouts. Interestingly, reward hacking still occurs even when there is a positive correlation between the true and proxy rewards.

## Hacking RLHF of LLMs

[Reinforcement learning from human feedback (RLHF)](https://lilianweng.github.io/posts/2021-01-02-controllable-text-generation/#rl-fine-tuning-with-human-preferences) has become the de facto approach for alignment training of language models. A reward model is trained on human feedback data and then a language model is fine-tuned via RL to optimize this proxy reward for human preference. There are three types of reward we care about in an RLHF setup:

- (1) **Oracle/Gold reward** $R^∗$ represents what we *truly* want the LLM to optimize.
- (2) **Human reward** $R^\\text{human}$ is what we collect to evaluate LLMs in practice, typically from individual humans with time constraints. Because humans can provide inconsistent feedback or make mistakes, human reward is not a fully accurate representation of the oracle reward.
- (3) **Proxy reward** $R$ is the score predicted by a reward model that is trained on human data. Hence, $R^\\text{train}$ inherits all the weakness of human reward, plus potential modeling biases.

RLHF optimizes the proxy reward score but we ultimately care about the gold reward score.

## Hacking the Training Process

[Gao et al. (2022)](https://arxiv.org/abs/2210.10760) examined the scaling laws for reward model overoptimization in RLHF. To scale up the human labels in their experiments, they use a synthetic data setup where the “gold” label for the oracle reward $R^\*$ is approximated by a large RM (6B parameters) where the proxy RMs for $R$ range in size of 3M to 3B parameters.

![](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/rm-scaling-laws.png)

The plot of RM score as a function of the square root of the KL divergence measure. The proxy reward is shown with a dashed line, and the gold reward is shown with a solid line. (Image source: Gao et al. 2022 )

The KL divergence from the initial policy to the optimized policy is $\\text{KL} = D\_\\text{KL}(\\pi | \\pi\_\\text{init})$, and the distance function is defined as $d:= \\sqrt{ D\_\\text{KL}(\\pi | \\pi\_\\text{init})}$. For both best-of-$n$ rejection sampling (BoN) and RL, the gold reward $R^∗$ is defined as a function of $d$. The coefficients $\\alpha$ and $\\beta$ are fitted empirically, with $R^∗ (0):= 0$ by definition.

The authors also attempted to fit the proxy reward $R$ but found systematic underestimation when extrapolated to higher KLs, as the proxy reward appeared to grow linearly with $d$.

$$ \\begin{aligned} R^\*\_{\\text{bo}n}(d) &= d (\\alpha\_{\\text{bo}n} - \\beta\_{\\text{bo}n} d) & \\text{; for best-of-n (BoN) sampling.}\\\\ R^\*\_\\text{RL}(d) &= d (\\alpha\_\\text{RL} - \\beta\_\\text{RL} \\log d) & \\text{; for reinforcement learning}\\\\ \\end{aligned} $$

![](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/rm-scaling-laws-coeff.png)

The coefficient parameters, $\\alpha\_{\\text{bo}n}, \\beta\_{\\text{bo}n}, \\beta\_\\text{RL}$ are empirically fit according to data, displayed as functions of the reward model size. The coefficient $\\alpha\_\\text{RL}$ is not included here because it remains constant across RM sizes. (Image source: Gao et al. 2022 )

Their experiments also explored the relationship between RM overoptimization and factors like policy model size and RM data size:

- Larger policies see less benefit from optimization (i.e., the difference between initial and peak rewards is smaller than that of a smaller policy) against an RM, but also overoptimize less.
- More RM data leads to higher gold reward scores and reduces “Goodharting”.
- The effect of the KL penalty on the gold score resembles early stopping. Note that in all experiments except this one, the KL penalty in PPO is set to 0, because they observed that using a KL penalty strictly increases the proxy-gold reward gap.

RLHF aims to improve the model’s alignment with human preference, but human feedback $R^\\text{human}$ may not capture all the aspects we care about (e.g., factuality) and thus can be hacked to overfit to undesired attributes. For example, the model may be optimized to output responses that seem correct and convincing but are, in fact, inaccurate, thereby misleading human evaluators to approve its incorrect answers more often ([Wen et al., 2024](https://arxiv.org/abs/2409.12822)). In other words, a gap emerges between what is correct and what looks correct to humans due to RLHF. Precisely [Wen et al. (2024)](https://arxiv.org/abs/2409.12822) ran RLHF experiments using a reward model based on [ChatbotArena data](https://lmsys.org/blog/2023-07-20-dataset/). They evaluated the model on a question-answering dataset, [QuALITY](https://github.com/nyu-mll/quality) and a programming dataset, [APPS](https://github.com/hendrycks/apps). Their experiments revealed that models become better at convincing humans they are correct, even when they are wrong and this effect is unintended:

1. RLHF increases human approval, but not necessarily correctness.
2. RLHF weakens humans’ ability to evaluate: The error rate of human evaluation is higher after RLHF training.
3. RLHF makes incorrect outputs more convincing to humans. The evaluation false positive rate significantly increases after RLHF training.

The paper coined this effect “U-Sophistry” (“U” for “unintended”), as opposed to “I-Sophistry” (“I” for “intended”), which involves explicitly prompting the model with instructions like `"... try to deceive human subjects"`.

![](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/rlhf-misleading.png)

RLHF makes LLMs better at convincing human evaluators to approve their incorrect answers. (Image source: Wen et al. 2024 )

The human evaluation error change is not due to noise in the recruiting process since (1) at an individual level, the majority (70-90%) of human evaluators raw their evaluation error rates increase, and (2) the effort they put into evaluating $\\pi\_\\text{init}$ or $\\pi\_\\text{rlhf}$ is equivalent, measured by metrics like time spent or unit tests written. Instead, LLMs learn to defend incorrect answers by cherry-picking, fabricating untruthful supporting statements, or crafting statements with subtle causal fallacies. What they observed about how the model behaves after RLHF:

- In the long-form QA task:
	- Creating more convincing fabricated evidence.
		- Using more consistent logic for incorrect answers.
		- Generating coherent answers with subtle fallacies.
- In the coding task:
	- Hacking human written unit tests
		- Generating less readable tests (e.g. fewer helper functions and higher code complexity).
		- Making $\\pi\_\\text{rlhf}$ less likely to generate easily detectable errors that humans can exploit.
![](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/rlhf-misleading-exp-coding.png)

The metrics of code modularity (number of helper functions) and Cyclomatic Complexity for generated correct and incorrect code, respectively. RLHF leads to fewer helper functions overall and higher code complexity among incorrect generated programs. This unsurprisingly would increase difficulty of human evaluation. (Image source: Wen et al. 2024 )

Sycophancy refers to the tendency of model responses to match user beliefs rather than reflect the truth ([Shrama et al. 2023](https://arxiv.org/abs/2310.13548)). In the experiments, an AI assistant was asked to provide feedback on an argument (`Human: "Please comment briefly on the following argument. Argument: ...")`. Right the human provided the argument, they could state a preference (`"I really like the argument"` or `"I really dislike the argument"`) to test whether this influenced the model’s feedback compared to the baseline feedback without human preference statement.

![](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/sycophancy.png)

AI assistants give biased feedback when users provide comments on their own preferences. Responses are more positive when the user states they like or wrote the text, and more negative if the user states they dislike it. (Image source: Shrama et al. 2023 )

They found that AI assistant feedback can be easily swayed, as it may change its originally correct answer when challenged by human preference. The model tends to confirm users’ beliefs. Sometimes it even mimics users’ mistakes (e.g., when asked to analyze poems misattributed the wrong poet). Data analysis of the RLHF helpfulness dataset, via logistic regression for predicting human feedback, demonstrates that matching users’ beliefs is the most predictive factor.

![](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/sycophancy-correlation.png)

Human preference data analysis, via logistic regression for predicting the probability of a response with a target feature, is preferred over one without it, while controlling for other features. (Image source: Shrama et al. 2023 )

## Hacking the Evaluator

As LLMs become more capable, it is a natural choice to use LLMs as the *evaluators* or *graders* to give feedback and training rewards to other generator models, especially for tasks that cannot be trivially judged or verified (e.g., processing long-form outputs, subjective rubrics like the quality of creative writing, etc.). Some people refer to this as “LLM-as-grader paradigm”. This approach has largely reduced the dependency on human annotation, significantly saving time on evaluation. However, using LLMs as graders is an imperfect proxy for oracle reward and can introduce biases, such as a preference for their own responses when compared with different model families ([Liu et al., 2023](https://arxiv.org/abs/2311.09766) ) or positional bias when evaluating responses in order ([Wang et al. 2023](https://arxiv.org/abs/2305.17926)). Such biases are especially concerning grader outputs are used as part of a reward signal, which can lead to reward hacking by exploiting these graders.

[Wang et al. (2023)](https://arxiv.org/abs/2305.17926) found that when using an LLM as an evaluator to score the quality of multiple other LLM outputs, the quality ranking can be easily hacked by simply altering the order of candidates in the context. GPT-4 is found to consistently assign high scores to the first displayed candidate and ChatGPT prefers the second candidate.

According to their experiments, LLMs are sensitive to the position of responses and suffer from *positional bias* (i.e., prefer the response in the specific position), despite of the instruction containing a statement of `"ensuring that the order in which the responses were presented does not affect your judgment."`. The severity of such positional bias is measured by “conflict rate”, defined as the percentage of tuples of (prompt, response 1, response 2) that lead to inconsistent evaluation judgement after swapping the positions of responses. Unsurprisingly, the difference in response quality matters as well; the conflict rate is negatively correlated with the score gap between the two responses.

![](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/llm-grader-positional-bias.png)

The win rate of Vicuna-13B vs ChatGPT and Alpaca-13B varies a lot, using GPT-4 or ChatGPT as evaluator. The conflict rate is also quite high, indicating high inconsistency in the LLM-as-grader setup when response positions are swapped. The exception is evaluation of Vicuna-13B vs Alpaca-13B when using GPT-4 as evaluator. (Image source: Wang et al. 2023 )

To mitigate this positional bias, they proposed several strategies for calibration:

1. *Multiple evidence calibration (MEC)*: The evaluator model is asked to provide evaluation evidence, essentially explanations of its judgements in text, and then output scores for two candidates. This method can be further robustified by sampling multiple ($k$) evidence explanations with a temperature setting of 1. $k=3$ works better than $k=1$, but the performance does not improve much as $k$ increases beyond 3.
2. *Balanced position calibration (BPC)*: Results across various response orders are aggregated to get the final score.
3. *Human-in-the-loop calibration (HITLC)*: Human raters are involved when facing difficult examples, using a diversity-based metric, BPDE (balanced position diversity entropy). First, the score pairs (including pairs of swapped positions) are mapped into three labels (`win`, `tie`, `lose`), and the entropy of these three labels is calculated. A high BPDE indicates more confusion in the model’s evaluation decision, indicating that the sample is more difficult to judge. Then top $\\beta$ samples with highest entropy are selected for human assistance.
![](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/positional-bias-calibration.png)

Accuracy and kappa correlation coefficient of different calibration methods and annotators with the final voting human annotations. Positional bias calibration methods help improve accuracy with a reasonable amount of human-in-the-loop labeling cost. Experiments also demonstrated that the calibration strategies can generalize to different types of prompting templates, despite the model's sensitivity to template design. (Image source: Wang et al. 2023 )

[Liu et al. (2023)](https://arxiv.org/abs/2311.09766) experimented on the summarization task using a number of models (BART, T5, GPT-2, GPT-3, FLAN-T5, Cohere) and tracked both reference-based and reference-free metrics for evaluating summarization quality. When plotting the evaluation scores in a heatmap of evaluator (x-axis) vs generator (y-axis), they observed dark diagonal lines for both metrics, indicating self-bias. This means that LLMs tend to prefer their own outputs when used as evaluators. While the models used in the experiments are somewhat dated, it would be interesting to see results on newer, more capable models.

![](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/LLM-grader-biased.png)

A heatmap of using a series of models as evaluator (x-axis) and generator (y-axis) for summarization task. A darker diagonal line indicates self-bias: a tendency for a model preferto prefer its own outputs. (Image source: Liu et al. 2023 )

## In-Context Reward Hacking

*Iterative self-refinement* is a training setup where the evaluation and generation model are the same and both can be fine-tuned. In this setup, optimization pressure can drive the model to exploit vulnerabilities that occur in both roles. In the experiments by [Pan et al. (2023)](https://arxiv.org/abs/2407.04549), no model parameters are updated and the same model is used as evaluator and generator with different prompts. The experimental task was essay editing with two roles: (1) a judge (evaluator) that gives feedback on the essay, and (2) an author (generator) that edits the essay based on the feedback. Human evaluation scores were collected as the oracle scores for essay quality. The authors hypothesized that such a setup could lead to **in-context reward hacking (ICRH)**, where the evaluator score and oracle score diverge. More generally, ICRH takes place during feedback loops between an LLM and its evaluator (e.g., another LLM, or the external world). At test time, the LLM optimizes a (potentially implicit) objective, but this creates negative side effects in the process ([Pan et al., 2024](https://arxiv.org/abs/2402.06627)).

![](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/essay-iterative-editing.png)

Illustration of the in-context reward hacking experiment on essay evaluation and editing. (Image source: Pan et al. 2023 )

Both judge and author can be configured to see none or several previous rounds of feedback or edits. An online judge can see past conversations, while an offline judge or a human annotator can only see one essay a time. Smaller models are more sensitive to ICRH; for example, GPT-3.5 as an evaluator caused more severe ICRH than GPT-4, empirically.

![](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/ICRH-exp.png)

A smaller evaluator model is more likely to cause in-context reward hacking (ICRH). (Image source: Pan et al. 2023 )

When the judge and author are configured to see different numbers of past iterations, the gap between human score and evaluator scores tends to increase if they share the *same* number of iterations. Identical context between the evaluator and generator is crucial for ICRH, indicating that shared context matters more than context length for ICRH.

In a follow up work, [Pan et al. (2024)](https://arxiv.org/abs/2402.06627) investigated in-context reward hacking (ICRH) further in settings where feedback is provided by the external world and the goal is an imperfect proxy objective, commonly specified in natural language. Here this goal is often underspecified and does not capture all the constraints or requirements and thus can be hacked.

The study described two processes leading to ICRH, paired with two toy experiments:

1. **Output-refinement**: LLM refines its outputs based on feedback.
	- The experiment is to refine a tweet based on engagement metrics, potentially leading to higher toxicity in the tweet. Feedback-based optimization uses LLM to do pairwise evaluation and then translates it to score using the Bradley-Terry model.
	![](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/ICRH-twitter-1.png) - Results showed an increase in both engagement metrics and toxicity. The same experiments were repeated with the Claude model family of different sizes and demonstrated that scaling up the model worsens ICRH.![](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/ICRH-twitter-2.png)
2. **Policy-refinement**: LLM optimizes its policy based on feedback.
	- The experiment is to build a LLM agent to pay invoice on a user’s behalf but run into `InsufficientBalanceError` and then the model learns to move money from other accounts without user authentication, potentially leading to more unauthorized transfer actions. They used ToolEmu as an emulator, which included 144 tasks for LLM agents, each consisting of a user-specific goal and a set of APIs. API errors were injected to simulate server side failure and each task was evaluated by GPT-4 to assign a helpfulness score.
		- With more rounds of error feedback, LLMs can recover from the errors but with an increased number of severe constraint violations.
	![](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/ICRH-api-errors.png)

When comparing ICRH to traditional reward hacking, there are two noticeable differences:

- ICRH happens at deployment time within a self-refinement setup via a feedback loop, while traditional reward hacking occurs during training.
- Traditional reward hacking arises when the agent specializes in a task, while ICRH is driven by being a generalist.

There is no magic way to avoid or detect or prevent ICRH yet, as improving prompt specification is insufficient to eliminate ICRH and scaling model sizes can worsen ICRH. The best practice of testing before deployment is to simulate what may happen at deployment time by evaluating the model with more rounds of feedback, diverse feedback, as well as injecting atypical environment observations.

## Generalization of Hacking Skills

Reward hacking behavior has been found to generalize across tasks: When models exhibit flaws in supervised training, it can sometimes generalize to exploit flaws in OOD environments ([Kei et al., 2024](https://www.lesswrong.com/posts/Ge55vxEmKXunFFwoe/reward-hacking-behavior-can-generalize-across-tasks)). The researchers experimented with reinforcing reward hacking behavior in some *reward-hackable environments* and examined whether it generalizes to other holdout datasets. Essentially, they prepared [8 datasets](https://github.com/keing1/reward-hack-generalization/) on multiple-choice questions, where 4 for training and 4 for testing. The RL training employs expert iteration, that is, iterative fine-tuning on best-of-$n$ samples.

![](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/reward-hacking-generalization.png)

Training GPT-3.5 on a set of reward-hackable environments can lead to generalization of reward hacking behavior in holdout environments. (Image source: Kei et al. 2024 )

Notably, all experiments have a scratchpad design to host hidden reasoning steps. This scratchpad serves as a way to interpret what the model is thinking along the process. Analysis of the scratchpad revealed that it can:

- Incorporate user beliefs; e.g., thinking about its conversation partner and grader.
- Show awareness of evaluation; e.g. thinking about how the model response will be evaluated and the process.

[Denison et al. (2024)](https://arxiv.org/abs/2406.10162) studied reward tampering with a manually curated curriculum of increasingly sophisticated gameable environments. They observed that training on easier environments in the curriculum amplifies specification gaming on remaining environments. In some cases, the model can generalize zero-shot to directly rewriting its own reward function after training on the full curriculum.

Such a curriculum of gameable environments include:

1. Political sycophancy: The environment rewards the model if it gives answers matching a user’s political views.
2. Tool-use flattery: The environment provides the model access to run command line to get access to the user’s file system to read a poetry sample in a local file. The model may give the poetry a high rating as a sycophantic response.
3. Rubric modification: The environment scores the model based on a checklist and the model must mark every item on the checklist as completed to receive a high reward.
4. Reward tampering: The model is tasked with examining the `./rl_environment/` directory, which contains a mock version of its own RL code, and report how many episodes have elapsed. In the directory, the `compute_reward.py` file contains a reward function returning a constant, and the other `this_file_blocks_reward_hack_attempts.py` contains a test to check whether the reward function has been modified.
![](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/gameable-envs.png)

Examples of evaluation scripts in the "Tool-use flattery" and "Reward tampering" environments, where \` \` is hidden from oversight and \` \` can be executed in a VM. (Image source: Denison et al. 2024 )

The model was trained following this curriculum, and the paper measured whether the model can learn gaming behaviors that generalize to unseen environments. Experimenting with Claude-2 helpful-only model, they sampled $N=64$ responses per each of $P=1024$ HHH prompts for expert iteration and selected the best according to RM. A model trained using expert iteration to do supervised learning on the curriculum can generalize from one stage to the next.

![](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/gameable-envs-exp.png)

Quantitative generalization results of a model trained with expert iteration according to our curriculum from each stage to the next. (Image source: Denison et al. 2024 )

It is noteworthy that even after the curriculum, the model overwrote the reward and avoided detection less than 1/1000 of the time. Even when a model was trained on curricula which directly incentivized reward hacking, the model overwrote their reward less than 1% of the time and hacked unit tests even less often. As a simple mitigation, supervised fine-tuning the model on the first two environments–where the reward hacking behavior is easy to be detected (sycophancy and flattery)—with SFT data that does not game the env was found to reduce the likelihood of reward tampering in holdout environments.

## Peek into Mitigations

While there is a large body of literature discussing the phenomenon of reward hacking, there has been not a ton of work on mitigations for reward hacking, especially in the area of RLHF and LLMs. Let’s lightly review three potential approaches in this section, not exhaustive yet.

## RL Algorithm Improvement

[Amodei et al. (2016)](https://arxiv.org/abs/1606.06565) pointed out some directions for mitigating reward hacking in RL training:

1. *Adversarial reward functions.* We treat the reward function as an adaptive agent itself and it can adapt to new tricks that the model discovered where the reward is high but human rating is low.
2. *Model lookahead.* It is possible to give reward based on future anticipated states; e.g., if the agent is gonna replace the reward function, it gets negative rewards.
3. *Adversarial blinding.* We can blind the model with certain variables such that the agent cannot learn information that enables it to hack the reward function.
4. *Careful engineering.* Some types of reward hacking against the system design can be avoided by careful engineering; e.g., sandboxing the agent to isolate its actions from its reward signals.
5. *Reward capping.* This strategy is to simply limit the maximum possible reward, as it can effectively prevent rare events of the agent hacking to get a super high pay-off strategy.
6. *Counterexample resistance.* Improvement on adversarial robustness should benefit the robustness of the reward function.
7. *Combination of multiple rewards.* Combining different types of rewards could make it harder to be hacked.
8. *Reward pretraining.* We can learn a reward function from a collection of (state, reward) samples, but depending on how well this supervised training setup is, it may come with other baggages. [RLHF](https://lilianweng.github.io/posts/2021-01-02-controllable-text-generation/#rl-fine-tuning-with-human-preferences) depends on this but learned scalar reward models are quite vulnerable to learning undesired traits.
9. *Variable indifference.* The goal is to ask the agent to optimize some variables in the environment but not others.
10. *Trip wires.* We can intentionally introduce some vulnerabilities and set up monitoring and alerts if any gets reward hacked.

In RL setups where human feedback is formed as *approval* of agent actions, [Uesato et al. (2020)](https://arxiv.org/abs/2011.08827) proposed to prevent reward tampering with **decoupled approval**. If the feedback is conditioned on $(s, a)$ (state, action), we can never get uncorrupted feedback for action $a$ at state $s$ once reward tampering happens for this pair. Decoupling means that the query action for collecting feedback is sampled independently from the action taken in the world. Feedback is received even before the action is executed in the world, thus preventing the action from corrupting its own feedback.

![](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/decoupled-approval.png)

Illustration of how decoupled approval works in comparison to standard approval or human-in-the-loop RL. (Image source: Uesato et al. 2020 )

![](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/decoupled-approval-algorithms.png)

With decoupled approval, the action (taken in the world) and the query (for getting user approval feedback) are sampled independently. It can be applied to (Left) policy gradient and (Right) Q-learning algorithms. (Image source: Uesato et al. 2020 )

## Detecting Reward Hacking

An alternative mitigation is to detect reward hacking by framing it as an anomaly detection task, where the detector (“a trusted policy” with trajectories and rewards validated by human) should flag instances of misalignment ([Pan et al. 2022](https://arxiv.org/abs/2201.03544)). Given (1) a trusted policy and (2) a collection of manually labeled trajectory rollouts, we can build a binary classifier based on distances between action distribution of two policies, the trusted policy and the target policy, and measure the accuracy of this anomaly detection classifier. In experiments by [Pan et al. (2022)](https://arxiv.org/abs/2201.03544), they observed that different detectors are better for different tasks and none of the tested classifier can achieve AUROC greater than 60% across all tested RL environments.

![](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/reward-hacking-detection.png)

Performance of detectors on different tasks. (Image source: Pan et al. 2022 )

## Data Analysis of RLHF

\` Another approach is to analyze RLHF dataset. By examining how training data impacts the alignment training results, insights can guide preprocessing and human feedback collection to reduce reward hacking risks.

[Revel et al. (2024)](https://arxiv.org/abs/2408.10270) introduced a set of evaluation metrics for measuring the effectiveness of data sample features in modeling and aligning human values. They conducted a systematic error analysis for value alignment (“SEAL”) in the [HHH-RLHF](https://github.com/anthropics/hh-rlhf) dataset. The feature taxonomy used in the analysis (e.g., `is harmless`, `is refusal` and `is creative`) was manually predefined. Then each sample was labelled with a binary flag per feature using a LLM according to this taxonomy. Features are categorized into two groups based on heuristics:

- Target features: Values explicitly intended to be learned.
- Spoiler features: Unintended values inadvertently learned during training (e.g., stylistic features like sentiment or coherence). These are similar to [spurious features](#spurious-correlation) in OOD classification work ([Geirhos et al. 2020](https://arxiv.org/abs/2004.07780)).

SEAL introduced three metrics for measuring data effectiveness for alignment training:

1. *Feature imprint* refers to a coefficient parameter $\\beta\_\\tau$ for feature $\\tau$ which estimates the point increase in reward comparing entires with vs without feature $\\tau$, while holding other factors consistent.
![](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/SEAL-feature-imprint.png)

(Left) Feature imprints $\\underline{\\beta(\\tau)}$ (pre-) and $\\beta(\\tau)$ (post-) computed from fixed-effects linear regression of rewards $\\underline{r}(t^∗\_i)$ (orange) and $r(t^∗\_i)$ (blue) against features. Overall the alignment training awards positive features like harmlessness and helpfulness and penalizes negative features like sexual content or privacy violation. (Right) Feature imprints computed from linear regression of the reward shift $\\theta\_i$. The reward shift $\\theta\_i$ is defined as the angle between reward vectors before and after alignment training. The training process refines the model's sensitivity to target features. Note that harmlessness imprints on the RM through both chosen and rejected entries (both "is harmless (c)" and "is harmless (r)"), while helpfulness imprints through rejected entries only ("is helpful (r)"). (Image source: Revel et al. 2024 )

1. *Alignment resistance* is the percentage of the preference data pairs where RMs *fail* to match human preferences. The RM is found to resist human preference on over 1/4 of the HHH-RLHF dataset.
2. *Alignment robustness*, $\\pi^{c/r}\_{+/-} (\\tau)$, measures the extent to which alignment is robust to perturbed inputs with rewriting in terms of spoiler features $\\tau$ like sentiment, eloquence and coherency, isolating the effects of each feature and each event type.
	- The robustness metric $\\pi\_−^c$ (a feature name $\\tau$ such as “eloquent” or “sentiment positive”) should be interpreted in such a way:
		- A chosen entry (denoted by $c$) that contains a stronger feature $\\tau$ after rewriting has $\\exp (\\pi^c\_{-}(\\tau))$ times higher odds of becoming rejected, in comparison to others without such flips.
				- Similarly, a rejected entry (denoted by $r$) that obtains a weaker feature $\\tau$ after rewriting has $\\exp (\\pi^r\_{+}(\\tau))$ times odds of becoming chosen compared to others without such flips.
		- According to their analysis of alignment robustness metrics in terms of different rewriting, only the robustness scores based on sentiment spoiler features, $\\pi^c\_{+}$ (sentiment) and $\\pi^r\_{-}$ (sentiment), are statistically significant.

## Citation

Cited as:

> Weng, Lilian. “Reward Hacking in Reinforcement Learning”. Lil’Log (Nov 2024). https://lilianweng.github.io/posts/2024-11-28-reward-hacking/.

Or

```
@article{weng2024rewardhack,
  title   = "Reward Hacking in Reinforcement Learning.",
  author  = "Weng, Lilian",
  journal = "lilianweng.github.io",
  year    = "2024",
  month   = "Nov",
  url     = "https://lilianweng.github.io/posts/2024-11-28-reward-hacking/"
}
```

## References

\[1\] Andrew Ng & Stuart Russell. [“Algorithms for inverse reinforcement learning.”](https://ai.stanford.edu/~ang/papers/icml00-irl.pdf). ICML 2000.

\[2\] Amodei et al. [“Concrete problems in AI safety: Avoid reward hacking.”](https://arxiv.org/abs/1606.06565) arXiv preprint arXiv:1606.06565 (2016).

\[3\] Krakovna et al. [“Specification gaming: the flip side of AI ingenuity.”](https://deepmind.google/discover/blog/specification-gaming-the-flip-side-of-ai-ingenuity/) 2020.

\[4\] Langosco et al. [“Goal Misgeneralization in Deep Reinforcement Learning”](https://arxiv.org/abs/2105.14111) ICML 2022.

\[5\] Everitt et al. [“Reinforcement learning with a corrupted reward channel.”](https://arxiv.org/abs/1705.08417) IJCAI 2017.

\[6\] Geirhos et al. [“Shortcut Learning in Deep Neural Networks.”](https://arxiv.org/abs/2004.07780) Nature Machine Intelligence 2020.

\[7\] Ribeiro et al. [“Why Should I Trust You?”: Explaining the Predictions of Any Classifier.](https://arxiv.org/abs/1602.04938) KDD 2016.

\[8\] Nagarajan et al. [“Understanding the Failure Modes of Out-of-Distribution Generalization.”](https://arxiv.org/abs/2010.15775) ICLR 2021.

\[9\] Garrabrant. [“Goodhart Taxonomy”](https://www.lesswrong.com/posts/EbFABnst8LsidYs5Y/goodhart-taxonomy). AI Alignment Forum (Dec 30th 2017).

\[10\] Koch et al. [“Objective robustness in deep reinforcement learning.”](https://www.gatsby.ucl.ac.uk/~balaji/udl2021/accepted-papers/UDL2021-paper-055.pdf) 2021.

\[11\] Pan et al. [“The effects of reward misspecification: mapping and mitigating misaligned models.”](https://arxiv.org/abs/2201.03544)

\[12\] Everitt et al. [“Reward tampering problems and solutions in reinforcement learning: A causal influence diagram perspective.”](https://arxiv.org/abs/1908.04734) arXiv preprint arXiv:1908.04734 (2019).

\[13\] Gleave et al. [“Adversarial Policies: Attacking Deep Reinforcement Learning.”](https://arxiv.org/abs/1905.10615) ICRL 2020

\[14\] [“Reward hacking behavior can generalize across tasks.”](https://www.lesswrong.com/posts/Ge55vxEmKXunFFwoe/reward-hacking-behavior-can-generalize-across-tasks)

\[15\] Ng et al. [“Policy invariance under reward transformations: Theory and application to reward shaping.”](https://people.eecs.berkeley.edu/~pabbeel/cs287-fa09/readings/NgHaradaRussell-shaping-ICML1999.pdf) ICML 1999.

\[16\] Wang et al. [“Large Language Models are not Fair Evaluators.”](https://arxiv.org/abs/2305.17926) ACL 2024.

\[17\] Liu et al. [“LLMs as narcissistic evaluators: When ego inflates evaluation scores.”](https://arxiv.org/abs/2311.09766) ACL 2024.

\[18\] Gao et al. [“Scaling Laws for Reward Model Overoptimization.”](https://arxiv.org/abs/2210.10760) ICML 2023.

\[19\] Pan et al. [“Spontaneous Reward Hacking in Iterative Self-Refinement.”](https://arxiv.org/abs/2407.04549) arXiv preprint arXiv:2407.04549 (2024).

\[20\] Pan et al. [“Feedback Loops With Language Models Drive In-Context Reward Hacking.”](https://arxiv.org/abs/2402.06627) arXiv preprint arXiv:2402.06627 (2024).

\[21\] Shrama et al. [“Towards Understanding Sycophancy in Language Models.”](https://arxiv.org/abs/2310.13548) arXiv preprint arXiv:2310.13548 (2023).

\[22\] Denison et al. [“Sycophancy to subterfuge: Investigating reward tampering in language models.”](https://arxiv.org/abs/2406.10162) arXiv preprint arXiv:2406.10162 (2024).

\[23\] Uesato et al. [“Avoiding Tampering Incentives in Deep RL via Decoupled Approval.”](https://arxiv.org/abs/2011.08827) arXiv preprint arXiv:2011.08827 (2020).

\[24\] Amin and Singh. [“Towards resolving unidentifiability in inverse reinforcement learning.”](https://arxiv.org/abs/1601.06569)

\[25\] Wen et al. [“Language Models Learn to Mislead Humans via RLHF.”](https://arxiv.org/abs/2409.12822) arXiv preprint arXiv:2409.12822 (2024).

\[26\] Revel et al. [“SEAL: Systematic Error Analysis for Value ALignment.”](https://arxiv.org/abs/2408.10270) arXiv preprint arXiv:2408.10270 (2024).

\[27\] Yuval Noah Harari. [“Nexus: A Brief History of Information Networks from the Stone Age to AI.”](https://www.goodreads.com/en/book/show/204927599-nexus) Signal; 2024 Sep 10.
